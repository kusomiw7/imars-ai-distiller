# imars_core.py (最終版 - 支援多供應商/多 Key 循環)

import os
import itertools
from google import genai 
from google.genai import types 
# 為了支援 OpenAI/DeepSeek，引入其 SDK
try:
    from openai import OpenAI, APIError
except ImportError:
    OpenAI = None
    APIError = Exception 

# --- 1. 流程控制常數 ---
MAX_ITERATIONS = 4 
TEMPERATURE_INIT = 0.8 
TEMPERATURE_REFINE = 0.4 

# --- 2. 供應商基礎配置 ---
VENDOR_CONFIG = {
    # base_url=None 表示使用 SDK 預設端點
    "gemini": {"base_url": None, "model_prefix": "gemini"},
    "openai": {"base_url": None, "model_prefix": "gpt"},
    "deepseek": {"base_url": "https://api.deepseek.com/v1", "model_prefix": "deepseek"}
    # 擴展提示：未來新增 Grok，可以在此處添加
}


# --- 3. 代理模型配置 ---

# 初始草稿代理 (Agent 0)
agent_initial = {
    'name': "Drafting Agent",
    # 為每個供應商定義模型，如果供應商Key不存在，將會引發錯誤，強制用戶提供正確配置
    'model': {"gemini": "gemini-2.5-flash", "openai": "gpt-3.5-turbo", "deepseek": "deepseek-coder"}, 
    'system_prompt': (
        "你是一個快速構建專家。你的任務是根據用戶的提示，生成一個結構清晰、內容完整的初始草稿。 "
        "重點在於覆蓋所有關鍵點，而非細節的絕對準確性。使用 Markdown 格式。"
    )
}

# 精煉代理池 (循環使用)
AGENTS = [
    {
        'name': "Logic & Factual Verifier",
        'model': {"gemini": "gemini-2.5-flash", "openai": "gpt-4-turbo", "deepseek": "deepseek-coder"},
        'system_prompt': (
            "你是一個嚴謹的邏輯與事實核查專家。仔細審查提供的當前答案，重點找出邏輯錯誤、矛盾或過時的事實。 "
            "只對錯誤和不準確之處進行修改和修正，並保持答案原有的結構。"
        )
    },
    {
        'name': "Style & Structure Polisher",
        'model': {"gemini": "gemini-2.5-flash", "openai": "gpt-3.5-turbo", "deepseek": "deepseek-chat"},
        'system_prompt': (
            "你是一個專業的文風和結構優化師。你的任務是提升當前答案的閱讀流暢性、專業度以及格式美觀度。 "
            "確保使用清晰的標題、列表和粗體字，使其易於掃描和閱讀。不要改變核心內容。"
        )
    },
    {
        'name': "Completeness Auditor",
        'model': {"gemini": "gemini-2.5-flash", "openai": "gpt-4o-mini", "deepseek": "deepseek-chat"},
        'system_prompt': (
            "你是一個知識完整性審計師。對比原始問題與當前答案，評估是否遺漏了任何用戶提示中要求的關鍵資訊或子話題。 "
            "如果發現遺漏，請補充必要的內容以讓答案更全面，並將新內容無縫整合到現有結構中。"
        )
    }
]


def call_ai_agent(agent_config, user_prompt, previous_answer, client_info):
    """
    實際呼叫 AI API 進行蒸餾與精煉。
    client_info = {'vendor': 'gemini', 'client': genai.Client, 'key_index': 0}
    """
    vendor = client_info['vendor'].lower()
    client_instance = client_info['client']
    
    if not client_instance:
        raise ConnectionError(f"AI Client ({vendor}) 尚未初始化。")
    
    # 1. 提示構建與模型設定
    model_name = agent_config['model'].get(vendor)
    if not model_name:
         raise KeyError(f"Agent '{agent_config['name']}' 沒有為供應商 '{vendor}' 定義模型。")

    if agent_config['name'] == "Drafting Agent":
        full_prompt = f"用戶原始問題：\n{user_prompt}\n\n{previous_answer}" 
        temperature = TEMPERATURE_INIT
    else:
        full_prompt = (
            f"用戶原始問題：\n{user_prompt}\n\n"
            f"--- 待精煉的當前答案 ---\n{previous_answer}\n\n"
            f"請根據您的專業職責，使用 {model_name}，直接輸出精煉後的完整答案。"
        )
        temperature = TEMPERATURE_REFINE
    
    system_prompt = agent_config['system_prompt']

    # 2. 執行 API 呼叫 (供應商判斷)
    try:
        if vendor == 'gemini':
            # 設置 Gemini API 請求配置
            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temperature
            )
            response = client_instance.models.generate_content(
                model=model_name,
                contents=full_prompt,
                config=config,
            )
            return response.text
        
        elif vendor in ['openai', 'deepseek']:
            # 設置 OpenAI 兼容 API 請求參數 (已透過初始化時的 base_url 導向正確端點)
            if OpenAI is None:
                 raise NotImplementedError("OpenAI SDK 未安裝。請檢查 requirements.txt。")
                 
            response = client_instance.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": full_prompt}
                ],
                temperature=temperature
            )
            return response.choices[0].message.content
        
        # Grok 等其他服務可在此處添加 'elif vendor == "grok":'
        
        else:
            # 此處理論上不會被執行，因為在初始化時已經過濾
            raise TypeError(f"不支援或無法識別的 AI 供應商: {vendor}")
            
    except APIError as e: 
        raise RuntimeError(f"API 呼叫失敗 ({vendor}, 模型: {model_name}, Key Index: {client_info['key_index']}): {str(e)}")
    except Exception as e:
        raise RuntimeError(f"API 呼叫失敗 ({vendor}, 模型: {model_name}, Key Index: {client_info['key_index']}): {str(e)}")


def start_imars_refinement(user_prompt, api_keys_pool): 
    """
    主控函數：執行多 Agent 迭代蒸餾流程。
    api_keys_pool: [{'vendor': 'gemini', 'key': '...'}, ...]
    """
    if not api_keys_pool:
        error_log = [{'type': 'System', 'title': '🚨 嚴重錯誤', 'content': '請提供至少一個 API Key 和供應商資訊。'}]
        return None, error_log

    process_history = []
    client_pool = []
    
    # 1. 初始化 Client Pool (初始化所有有效的客戶端)
    for i, config in enumerate(api_keys_pool):
        vendor = config.get('vendor', '').lower()
        api_key = config.get('key')
        client = None
        
        vendor_info = VENDOR_CONFIG.get(vendor)
        if not vendor_info:
            process_history.append({'type': 'Warning', 'title': f'⚠️ {vendor} 初始化失敗', 'content': f'不支援的 AI 供應商。跳過 Key {i+1}。'})
            continue
            
        try:
            if vendor == 'gemini':
                client = genai.Client(api_key=api_key)
            
            elif vendor in ['openai', 'deepseek']:
                if OpenAI is not None:
                    # 使用 base_url 來初始化 OpenAI 客戶端 (OpenAI base_url 為 None)
                    client = OpenAI(
                        api_key=api_key,
                        base_url=vendor_info["base_url"] 
                    )
                else:
                    process_history.append({'type': 'Warning', 'title': f'⚠️ {vendor} 初始化失敗', 'content': 'OpenAI SDK 未安裝，跳過此 Key。'})
                    continue
            
            client_pool.append({
                'vendor': vendor, 
                'client': client,
                'key_index': i + 1 
            })
            process_history.append({'type': 'System', 'title': '✅ Client 初始化', 'content': f'Key {i+1} (供應商: {vendor}) 成功加入 Client Pool。'})
            
        except Exception as e:
            process_history.append({'type': 'Error', 'title': f'🚨 Key {i+1} 錯誤', 'content': f'無法初始化 {vendor} Client。請檢查密鑰是否有效。錯誤: {str(e)}'})

    if not client_pool:
        error_log = [{'type': 'System', 'title': '🚨 嚴重錯誤', 'content': '所有提供的密鑰都無效或供應商不被支援。'}]
        return None, error_log

    # 設置循環迭代器：讓每次呼叫都使用不同的 Key
    client_iterator = itertools.cycle(client_pool)
    
    # 2. 初始草稿生成 (使用第一個 Key)
    current_answer = ""
    first_client_info = client_pool[0] 
    initial_instruction = "請根據原始問題，提供一個結構簡單的初始草稿，以便後續 Agent 進行精煉。"
    
    try:
        current_answer = call_ai_agent(
            agent_initial, 
            user_prompt, 
            initial_instruction, 
            first_client_info
        )
        process_history.append({
            'type': 'Agent', 
            'title': f'1. {agent_initial["name"]} (Key {first_client_info["key_index"]} 草稿生成)', 
            'content': '初始草稿生成完畢。'
        })
    except Exception as e:
        process_history.append({'type': 'Error', 'title': '🚨 初始草稿生成失敗', 'content': str(e)})
        return None, process_history
    
    # 3. 迭代精煉迴圈
    for i in range(MAX_ITERATIONS):
        agent = AGENTS[i % len(AGENTS)] 
        
        # 循環取出下一個 Key
        next_client_info = next(client_iterator)
        
        try:
            refined_answer = call_ai_agent(
                agent, 
                user_prompt, 
                current_answer,
                next_client_info 
            )
            current_answer = refined_answer 
            
            model_used = agent["model"].get(next_client_info["vendor"], "N/A")
            process_history.append({
                'type': 'Agent', 
                'title': f'{i+2}. {agent["name"]} (Key {next_client_info["key_index"]} 迭代精煉)', 
                'content': f'本輪精煉完成。供應商: {next_client_info["vendor"]}, 模型: {model_used}'
            })
            
        except Exception as e:
            process_history.append({'type': 'Error', 'title': f'🚨 迭代 {i+1} 失敗 ({agent["name"]})', 'content': str(e)})
            break 

    # 4. 最終答案返回
    return current_answer, process_history
