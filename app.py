# app.py (最終版 - 接收 Key Pool 並啟用 CORS)

import os
from flask import Flask, request, jsonify
from flask_cors import CORS  # 確保 Flask-Cors 存在
# 嘗試從 imars_core 引入，確保 imars_core.py 存在
try:
    from imars_core import start_imars_refinement
except ImportError:
    # 如果 imars_core.py 找不到，則在此處拋出錯誤
    start_imars_refinement = None
    print("FATAL ERROR: Could not import start_imars_refinement from imars_core. Is imars_core.py present?")

app = Flask(__name__)
# 解決 Load failed 的關鍵：啟用 CORS，允許所有來源（*）
# origins='*' 是最寬鬆的設定，用於開發和 BYOK 服務
CORS(app, supports_credentials=True, origins='*') 

@app.route('/', methods=['GET'])
def home():
    # 檢查核心功能是否載入
    if not start_imars_refinement:
        return "FATAL ERROR: imars_core not loaded.", 500
        
    return "IMARS Backend is running! (API endpoint is /api/distill)", 200

@app.route('/api/distill', methods=['POST'])
def handle_distillation():
    data = request.json
    
    user_prompt = data.get('prompt')
    # 接收新的 Key Pool 結構
    api_keys_pool = data.get('api_keys_pool', []) 

    if not user_prompt:
        return jsonify({"error": "Missing prompt"}), 400
        
    # 檢查 Key Pool 是否至少有一個 Key 對象
    if not api_keys_pool or not isinstance(api_keys_pool, list) or not api_keys_pool[0].get('key'):
        return jsonify({
            "success": False,
            "error": "Missing required API key pool. Please provide a list of {'vendor', 'key'} objects."
        }), 400

    try:
        # 執行核心 AI 邏輯
        final_answer, process_history = start_imars_refinement(user_prompt, api_keys_pool)
        
        # 檢查核心返回的結果是否為 None (代表啟動失敗)
        if final_answer is None:
             return jsonify({
                "success": False,
                # 這裡的錯誤訊息會包含詳細的 API 錯誤代碼
                "error": "AI 服務啟動或精煉失敗。請檢查 API Keys 或供應商名稱是否正確。",
                "log": process_history
            }), 500

        return jsonify({
            "success": True,
            "final_answer": final_answer,
            "log": process_history
        })
    
    except Exception as e:
        # 打印錯誤到 Render log
        print(f"Unhandled Error during distillation: {e}")
        return jsonify({"error": f"Internal distillation error: {str(e)}"}), 500

if __name__ == '__main__':
    # 僅用於本地測試
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
