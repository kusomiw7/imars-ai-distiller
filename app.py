# app.py (最終版 - 接收 Key Pool)

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from imars_core import start_imars_refinement 

app = Flask(__name__)
# 啟用 CORS，允許所有來源（*），以支持用戶從任何網址（包括本地）連接到您的 Render 服務
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
        
    # 檢查：確保至少有一個 Key 被提供
    if not api_keys_pool or not isinstance(api_keys_pool, list) or not api_keys_pool[0].get('key'):
        return jsonify({
            "success": False,
            "error": "Missing required API key pool. Please provide a list of {'vendor', 'key'} objects."
        }), 400

    try:
        # 執行核心 AI 邏輯
        final_answer, process_history = start_imars_refinement(user_prompt, api_keys_pool)
        
        if final_answer is None:
             # 如果 final_answer 為空，表示啟動或精煉失敗
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
        print(f"Unhandled Error during distillation: {e}")
        return jsonify({"error": f"Internal distillation error: {str(e)}"}), 500

if __name__ == '__main__':
    # 僅用於本地測試
    app.run(debug=True, port=os.getenv("PORT", 5000))
