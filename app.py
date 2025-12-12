# app.py (最終版 - 接收 Key Pool 並啟用 CORS)

import os
from flask import Flask, request, jsonify
from flask_cors import CORS  # 確保 Flask-Cors 存在
from imars_core import start_imars_refinement 

app = Flask(__name__)
# 解決 Load failed 的關鍵：啟用 CORS，允許所有來源（*）
CORS(app, supports_credentials=True, origins='*') 

@app.route('/', methods=['GET'])
def home():
    return "IMARS Backend is running! (API endpoint is /api/distill)", 200

@app.route('/api/distill', methods=['POST'])
def handle_distillation():
    data = request.json
    
    user_prompt = data.get('prompt')
    # 接收新的 Key Pool 結構
    api_keys_pool = data.get('api_keys_pool', []) 

    if not user_prompt:
        return jsonify({"error": "Missing prompt"}), 400
        
    if not api_keys_pool or not isinstance(api_keys_pool, list) or not api_keys_pool[0].get('key'):
        # 這是舊版 app.py 可能出錯的地方，我們現在確保檢查的是正確的結構
        return jsonify({
            "success": False,
            "error": "Missing required API key pool. Please provide a list of {'vendor', 'key'} objects."
        }), 400

    try:
        # 執行核心 AI 邏輯
        final_answer, process_history = start_imars_refinement(user_prompt, api_keys_pool)
        
        if final_answer is None:
             return jsonify({
                "success": False,
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
    app.run(debug=True, port=os.getenv("PORT", 5000))
    # Final CORS
