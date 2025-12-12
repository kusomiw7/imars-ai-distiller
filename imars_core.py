# imars_core.py (最終發布版本 - 支援多 AI 供應商概念)

import os
from google import genai 
from google.genai import types 
# TODO: 未來在此處引入其他供應商的 SDK，如: from openai import OpenAI

# --- 1. 流程控制常數 ---
MAX_ITERATIONS = 4 
TEMPERATURE_INIT = 0.8 
TEMPERATURE_REFINE = 0.4 

# --- 2. 代理模型配置 (Agent Pool) ---

# 初始草稿代理 (Agent 0)
agent_initial = {
    'name': "Drafting Agent",
    'model': "gemini-2.5-flash", 
    'system_prompt': (
        "你是一個快速構建專家。你的任務是根據用戶的提示，生成一個結構清晰、內容完整的初始草稿。 "
        "重點在於覆蓋所有關鍵點，而非細節的絕對準確性。使用 Markdown 格式。"
    )
}

# 精煉代理池 (循環使用)
AGENTS = [
    {
        'name': "Logic & Factual Verifier",
        'model': "gemini-2.5-flash",
        'system_prompt': (
            "你是一個嚴謹的邏輯與事實核查專家。仔細審查提供的當前答案，重點找出邏輯錯誤、矛盾或過時的事實。 "
            "只對錯誤和不準確之處進行修改和修正，並保持答案原有的結構。"
        )
    },
    {
        'name': "Style & Structure Polisher",
        'model': "gemini-2.5-flash",
        'system_prompt': (
            "你是一個專業的文風和結構優化師。你的任務是提升當前答案的閱讀流暢性、專業度以及格式美觀度。 "
            "確保使用清晰的標題、列表和粗體字，使其易於掃描和閱讀。不要改變核心內容。"
        )
    },
    {
        'name': "Completeness Auditor",
        'model': "gemini-2.5-flash",
        'system_prompt': (
            "你是一個知識完整性審計師。對比原始問題與當前答案，評估是否遺漏了任何用戶提示中要求的關鍵資訊或子話題。 "
            "如果發現遺漏，請補充必要的內容以讓答案更全面，並將新內容無縫整合到現有結構中。"
        )
    }
]


def call_ai_agent(agent_config, user_prompt, previous_answer, client_instance, vendor):
    """
    實際呼叫 AI API 進行蒸餾與精煉。根據傳入的 vendor 執行對應的 API 呼叫。
    """
    if not client_instance:
        raise ConnectionError("AI Client 尚未初始化。請檢查 API Key。")
    
    # 1. 提示構建
    if agent_config['name'] == "Drafting Agent":
        full_prompt = (
            f"用戶原始問題：\n{user_prompt}\n\n"
            f"{previous_answer}" 
        )
        temperature = TEMPERATURE_INIT
    else:
        full_prompt = (
            f"用戶原始問題：\n{user_prompt}\n\n"
            f"--- 待精煉的當前答案 ---\n{previous_answer}\n\n"
            f"請根據您的專業職責，直接輸出精煉後的完整答案。"
        )
        temperature = TEMPERATURE_REFINE

    # 2. 執行 API 呼叫 (供應商判斷)
    model = agent_config['model']

    if vendor == 'gemini':
        # 設置 Gemini API 請求配置
        config = types.GenerateContentConfig(
            system_instruction=agent_config['system_prompt'],
            temperature=temperature
        )
        
        try:
            # 呼叫 Gemini
            response = client_instance.models.generate_content(
                model=model,
                contents=full_prompt,
                config=config,
            )
            return response.text
        except Exception as e:
            raise RuntimeError(f"Gemini API 呼叫失敗 ({agent_config['name']}, 模型: {model}): {str(e)}")
    
    # elif vendor == 'openai':
    #     raise NotImplementedError("OpenAI 供應商尚未實作。")
        
    else:
        # 如果供應商類型無法識別，則報錯
        raise TypeError(f"不支援或無法識別的 AI 供應商: {vendor}")


def start_imars_refinement(user_prompt, api_config={}): 
    """
    主控函數：執行多 Agent 迭代蒸餾流程。
    api_config = {'vendor': 'gemini'|'openai'|..., 'key': 'YOUR_API_KEY', 'model_override': 'model_name'}
    """
    # 錯誤檢查：確保配置和密鑰存在
    if not api_config or not api_config.get('key') or not api_config.get('vendor'):
        error_log = [{'type': 'System', 'title': '🚨 嚴重錯誤', 'content': '請提供包含供應商(vendor)和密鑰(key)的 API 配置。'}]
        return None, error_log

    process_history = []
    vendor = api_config['vendor'].lower()
    api_key = api_config['key']
    client = None
    
    # 1. 初始化 Client (根據供應商類型)
    try:
        if vendor == 'gemini':
            client = genai.Client(api_key=api_key)
        # elif vendor == 'openai':
        #     client = openai.OpenAI(api_key=api_key)
        else:
            raise ValueError(f"不支援的 AI 供應商: {vendor}")
            
        process_history.append({'type': 'System', 'title': '✅ Client 初始化', 'content': f'AI Client (供應商: {vendor}) 成功初始化。'})
            
    except Exception as e:
        error_log = [{'type': 'System', 'title': '🚨 客戶端錯誤', 'content': f'無法初始化 AI Client。請檢查密鑰或供應商名稱。錯誤: {str(e)}'}]
        return None, error_log

    # 2. 覆蓋模型名稱 (確保所有 Agent 使用同一模型，如果提供了 model_override)
    if api_config.get('model_override'):
        model_name = api_config['model_override']
        agent_initial['model'] = model_name
        for agent in AGENTS:
            agent['model'] = model_name

    # 3. 初始草稿生成
    current_answer = ""
    try:
        initial_instruction = "請根據原始問題，提供一個結構簡單的初始草稿，以便後續 Agent 進行精煉。"
        current_answer = call_ai_agent(
            agent_initial, 
            user_prompt, 
            initial_instruction, 
            client,
            vendor # 傳遞供應商名稱
        )
        process_history.append({'type': 'Agent', 'title': f'1. {agent_initial["name"]} (草稿生成)', 'content': '初始草稿生成完畢。'})
    except Exception as e:
        process_history.append({'type': 'Error', 'title': '🚨 初始草稿生成失敗', 'content': str(e)})
        return None, process_history
    
    # 4. 迭代精煉迴圈
    for i in range(MAX_ITERATIONS):
        agent = AGENTS[i % len(AGENTS)] 
        
        try:
            refined_answer = call_ai_agent(
                agent, 
                user_prompt, 
                current_answer,
                client,
                vendor # 傳遞供應商名稱
            )
            current_answer = refined_answer 
            
            process_history.append({
                'type': 'Agent', 
                'title': f'{i+2}. {agent["name"]} (迭代精煉)', 
                'content': f'本輪精煉完成。模型: {agent["model"]}'
            })
            
        except Exception as e:
            process_history.append({'type': 'Error', 'title': f'🚨 迭代 {i+1} 失敗 ({agent["name"]})', 'content': str(e)})
            break 

    # 5. 最終答案返回
    return current_answer, process_history
