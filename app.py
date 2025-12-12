# app.py (最終發布版本)

import os
from flask import Flask, request, jsonify
from flask_cors import CORS # 確保已導入 CORS
from imars_core import start_imars_refinement 

app = Flask(__name__)
CORS(app) 

@app.route('/', methods=['GET'])
def home():
    return "IMARS Backend is running! (API endpoint is /api/distill)", 200

@app.route('/api/distill', methods=['POST'])
def handle_distillation():
    data = request.json
    
    user_prompt = data.get('prompt')
    # 接收包含 vendor, key, model_override 的配置物件
    api_config = data.get('api_config', {}) 

    if not user_prompt:
        return jsonify({"error": "Missing prompt"}), 400
        
    # 檢查：確保 api_config 包含核心信息
    if not api_config or not api_config.get('vendor') or not api_config.get('key'):
        return jsonify({
            "success": False,
            "error": "Missing required API configuration (vendor and key). Please provide the AI vendor and API key in the 'api_config' object."
        }), 400

    try:
        # 執行核心 AI 邏輯
        final_answer, process_history = start_imars_refinement(user_prompt, api_config)
        
        if final_answer is None and process_history:
             # 如果 final_answer 為空，表示啟動或精煉失敗
             return jsonify({
                "success": False,
                "error": "AI 服務啟動或精煉失敗。請檢查 API Key 或供應商名稱是否正確。",
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
    os.environ['GEMINI_API_KEY'] = 'YOUR_LOCAL_TEST_API_KEY_HERE' 
    app.run(debug=True, port=os.getenv("PORT", 5000))
