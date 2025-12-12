# imars_core.py (最終版 - 支援多供應商/多 Key 循環)

import os
import itertools
from google import genai
from google.genai import types
try:
    from openai import OpenAI, APIError
except ImportError:
    OpenAI = None
    APIError = Exception
except Exception:
    OpenAI = None
    APIError = Exception


# --- 1. 流程控制常數 ---
MAX_ITERATIONS = 4
TEMPERATURE_INIT = 0.8
TEMPERATURE_REFINE = 0.4


# --- 2. 供應商基礎配置 (關鍵) ---
VENDOR_CONFIG = {
    "gemini": {"base_url": None, "model_prefix": "gemini"},
    "openai": {"base_url": None, "model_prefix": "gpt"},
    "deepseek": {"base_url": "https://api.deepseek.com/v1", "model_prefix": "deepseek"}
}


# --- 3. 代理模型配置 ---
agent_initial = {
    'name': "Drafting Agent",
    'model': {"gemini": "gemini-2.5-flash", "openai": "gpt-3.5-turbo", "deepseek": "deepseek-coder"}, 
    'system_prompt': "你是一個快速構建專家。請根據用戶提示，在保持內容完整、結構清晰的前提下，直接生成一個詳盡的草稿答案，不輸出任何前言或結尾語句。"
}

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
    
    model_name = agent_config['model'].get(vendor)
    
    if not model_name:
        return None, f"模型配置錯誤：{vendor} 供應商缺少模型名稱。"
        
    system_prompt = agent_config['system_prompt']
    
    # 構建消息歷史
    if previous_answer:
        prompt_with_answer = (
            f"{system_prompt}\n\n"
            f"用戶原始提示: {user_prompt}\n\n"
            f"當前答案: {previous_answer}"
        )
        messages = [{"role": "user", "content": prompt_with_answer}]
    else:
        messages = [{"role": "user", "content": f"{system_prompt}\n\n用戶原始提示: {user_prompt}"}]


    try:
        if vendor == "gemini":
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
            base_url = VENDOR_CONFIG[vendor]['base_url']
            
            client = OpenAI(
                api_key=api_key, 
                base_url=base_url if base_url else "https://api.openai.com/v1"
            )
            
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
        return None, f"API 呼叫失敗 ({vendor}, 模型: {model_name}, Key Index: {client_info['index']}): {e}"
    except Exception as e:
        return None, f"API 呼叫失敗 ({vendor}, 模型: {model_name}, Key Index: {client_info['index']}): {str(e)}"

# --- 5. 蒸餾啟動函數 ---
def start_imars_refinement(user_prompt, api_keys_pool):
    
    valid_clients = []
    process_history = []
    
    for i, client_data in enumerate(api_keys_pool):
        vendor = client_data.get('vendor', '').lower()
        key = client_data.get('key')
        
        if vendor in VENDOR_CONFIG and key and key.strip():
            valid_clients.append({
                'vendor': vendor,
                'key': key,
                'index': i + 1,
                'failed': False
            })
            process_history.append(f"Key {i+1} (供應商: {vendor}) 成功加入 Client Pool。")
        elif key and key.strip():
            process_history.append(f"Key {i+1} (供應商: {vendor}) 失敗：不支援的供應商或 Key 無效。")

    
    if not valid_clients:
        return None, ["🚨 嚴重錯誤: 所有提供的密鑰都無效或供應商不被支援。"]
        
    
    key_iterator = itertools.cycle(range(len(valid_clients)))
    process_history.insert(0, "✅ Client 初始化")
    
    final_answer = None
    
    # 1. 初始草稿
    current_key_index = next(key_iterator)
    client_info = valid_clients[current_key_index]
    
    process_history.append(f"1. Drafting Agent (Key {client_info['index']} 供應商: {client_info['vendor']} 草稿生成)")
    
    draft, error = call_ai_agent(agent_initial, user_prompt, None, client_info)
    
    if error:
        process_history.append(f"🚨 初始草稿生成失敗: {error}")
        return None, process_history
        
    final_answer = draft
    
    # 2. 迭代精煉
    for i in range(MAX_ITERATIONS):
        agent_config = AGENTS[i % len(AGENTS)] 
        
        current_key_index = next(key_iterator)
        client_info = valid_clients[current_key_index]
        
        step_name = f"{i + 2}. {agent_config['name']} (Key {client_info['index']} 供應商: {client_info['vendor']} 迭代精煉)"
        process_history.append(step_name)
        
        refined_answer, error = call_ai_agent(agent_config, user_prompt, final_answer, client_info)
        
        if error:
            process_history.append(f"🚨 第 {i + 2} 步精煉失敗: {error}")
            if i > 0 and '失敗' in process_history[-2]:
                process_history.append("🚨 連續兩次精煉失敗，流程終止。")
                break
            continue
            
        final_answer = refined_answer
        
    return final_answer, process_history
