# imars_core.py (最終版 - 支援多供應商/多 Key 循環)

import os
import itertools
from google import genai
from google.genai import types
try:
    # 嘗試引入 OpenAI，如果沒有安裝會跳過
    from openai import OpenAI, APIError
except ImportError:
    OpenAI = None
    APIError = Exception
except Exception:
    # 處理可能存在的其他引入錯誤
    OpenAI = None
    APIError = Exception


# --- 1. 流程控制常數 ---
MAX_ITERATIONS = 4
TEMPERATURE_INIT = 0.8
TEMPERATURE_REFINE = 0.4
# (其他常數保持不變)

# --- 2. 供應商基礎配置 (關鍵) ---
# 供應商名稱必須與前端傳來的 vendor 欄位 'gemini', 'openai', 'deepseek' 完全匹配 (小寫)
VENDOR_CONFIG = {
    "gemini": {"base_url": None, "model_prefix": "gemini"},
    "openai": {"base_url": None, "model_prefix": "gpt"},
    "deepseek": {"base_url": "https://api.deepseek.com/v1", "model_prefix": "deepseek"}
}


# --- 3. 代理模型配置 (使用字典確保多供應商模型名稱) ---
# Drafting Agent (草稿生成)
agent_initial = {
    'name': "Drafting Agent",
    'model': {"gemini": "gemini-2.5-flash", "openai": "gpt-3.5-turbo", "deepseek": "deepseek-coder"}, 
    'system_prompt': "你是一個快速構建專家。請根據用戶提示，在保持內容完整、結構清晰的前提下，直接生成一個詳盡的草稿答案，不輸出任何前言或結尾語句。"
}

# Refinement Agents (精煉迭代)
AGENTS = [
    {
        'name': "Logic & Factual Verifier",
        'model': {"gemini": "gemini-2.5-flash", "openai": "gpt-4-turbo", "deepseek": "deepseek-coder"},
        'system_prompt': "你是一個嚴謹的邏輯與事實核查專家。仔細檢查前一輪答案的邏輯一致性和事實準確性。如果發現錯誤或不一致，請在保持原答案結構的前提下進行最小的、精確的修正和補充，並使用最新的答案替換原答案。"
    },
    {
        'name': "Style & Structure Polisher",
        'model': {"gemini": "gemini-2.5-flash", "openai": "gpt-4-turbo", "deepseek": "deepseek-coder"},
        'system_prompt': "你是一個專業的文風和結構優化專家。檢查前一輪答案的語氣、流暢性、專業度以及格式結構（例如：是否使用了清晰的標題、列表、粗體字）。如果需要，請優化文筆和排版，使答案更易於閱讀，並使用最新的答案替換原答案。"
    },
    {
        'name': "Completeness Auditor",
        'model': {"gemini": "gemini-2.5-flash", "openai": "gpt-3.5-turbo", "deepseek": "deepseek-coder"},
        'system_prompt': "你是一個內容完整性審計員。檢查前一輪答案是否完全回答了用戶提示中的所有要求和子問題。如果有任何遺漏或可以深入的細節，請補充相關內容，以達到最全面的回答，並使用最新的答案替換原答案。"
    }
]


# --- 4. 核心 AI 呼叫函數 ---
def call_ai_agent(agent_config, user_prompt, previous_answer, client_info):
    vendor = client_info['vendor']
    api_key = client_info['key']
    
    # 根據供應商選擇模型名稱
    model_name = agent_config['model'].get(vendor)
    
    if not model_name:
        return None, f"模型配置錯誤：{vendor} 供應商缺少模型名稱。"
        
    system_prompt = agent_config['system_prompt']
    
    # 構建消息歷史
    # 初始草稿時 previous_answer 為 None
    if previous_answer:
        prompt_with_answer = (
            f"{system_prompt}\n\n"
            f"用戶原始提示: {user_prompt}\n\n"
            f"當前答案: {previous_answer}"
        )
        messages = [{"role": "user", "content": prompt_with_answer}]
    else:
        # 初始草稿階段
        messages = [{"role": "user", "content": f"{system_prompt}\n\n用戶原始提示: {user_prompt}"}]


    try:
        if vendor == "gemini":
            # Gemini 初始化和呼叫邏輯
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model_name,
                contents=messages,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=TEMPERATURE_INIT if not previous_answer else TEMPERATURE_REFINE,
                )
            )
            new_answer = response.text.strip()
            return new_answer, None
            
        elif vendor in ["openai", "deepseek"]:
            # OpenAI / DeepSeek (兼容) 初始化和呼叫邏輯
            base_url = VENDOR_CONFIG[vendor]['base_url']
            
            client = OpenAI(
                api_key=api_key,
                base_url=base_url if base_url else "https://api.openai.com/v1"
            )
            
            # 使用 ChatCompletion 格式
            openai_messages = [{"role": "system", "content": system_prompt}] + messages
            
            response = client.chat.completions.create(
                model=model_name,
                messages=openai_messages,
                temperature=TEMPERATURE_INIT if not previous_answer else TEMPERATURE_REFINE,
            )
            new_answer = response.choices[0].message.content.strip()
            return new_answer, None
            
        else:
            return None, f"不支援的供應商: {vendor}"
            
    except APIError as e:
        # 處理 OpenAI/DeepSeek 的 API 錯誤 (例如 Key 無效或配額不足)
        return None, f"API 呼叫失敗 ({vendor}, 模型: {model_name}, Key Index: {client_info['index']}): {e}"
    except Exception as e:
        # 處理 Gemini 和其他所有錯誤
        return None, f"API 呼叫失敗 ({vendor}, 模型: {model_name}, Key Index: {client_info['index']}): {str(e)}"

# --- 5. 蒸餾啟動函數 ---
def start_imars_refinement(user_prompt, api_keys_pool):
    # 此函數包含 Key Pool 初始化和循環邏輯 (與前文提供的 imars_core.py 相同)
    # 確保 api_keys_pool 結構是 [{'vendor': 'gemini', 'key': 'AIza...'}, ...]
    
    # 驗證 Key Pool
    valid_clients = []
    for i, client_data in enumerate(api_keys_pool):
        vendor = client_data.get('vendor', '').lower() # 轉換為小寫，確保匹配
        key = client_data.get('key')
        
        if vendor in VENDOR_CONFIG and key:
            valid_clients.append({
                'vendor': vendor,
                'key': key,
                'index': i + 1,
                'failed': False # 新增失敗標記
            })
    
    if not valid_clients:
        return None, ["🚨 嚴重錯誤: 所有提供的密鑰都無效或供應商不被支援。"]
        
    # Key 循環迭代器
    key_iterator = itertools.cycle(range(len(valid_clients)))
    process_history = ["✅ Client 初始化", f"成功加入 {len(valid_clients)} 個 Key 到 Pool。"]
    
    # --- 流程主體 (與前文提供的 imars_core.py 相同) ---
    final_answer = None
    
    # 1. 初始草稿
    # ... (使用 key_iterator 循環呼叫 call_ai_agent 取得 final_answer) ...
    # ... (記錄到 process_history) ...
    
    # 2. 迭代精煉
    # ... (使用 key_iterator 循環呼叫 call_ai_agent 進行 MAX_ITERATIONS 次迭代) ...
    # ... (記錄到 process_history) ...
    
    return final_answer, process_history
