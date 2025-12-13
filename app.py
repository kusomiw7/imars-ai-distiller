# app.py (最終版 - 接收 Key Pool 並啟用 CORS)

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
try:
    from imars_core import start_imars_refinement
except ImportError:
    start_imars_refinement = None
    # 這行日誌將在 Render log 中明確指出檔案載入失敗
    print("FATAL ERROR: Could not import start_imars_refinement from imars_core. Is imars_core.py present?")

app = Flask(__name__)
# 解決 CORS 的關鍵：允許所有來源（*）
print("IMARS Flask App Initializing...") # 檢查是否載入的日誌
CORS(app, supports_credentials=True, origins='*') 

@app.route('/', methods=['GET'])
def home():
    if not start_imars_refinement:
        return "FATAL ERROR: imars_core not loaded.", 500
        
    return "IMARS Backend is running! (API endpoint is /api/distill)", 200

@app.route('/api/distill', methods=['POST'])
def handle_distillation():
    data = request.json
    
    user_prompt = data.get('prompt')
    api_keys_pool = data.get('api_keys_pool', []) 

    if not user_prompt:
        return jsonify({"error": "Missing prompt"}), 400
        
    if not api_keys_pool or not isinstance(api_keys_pool, list) or not api_keys_pool[0].get('key'):
        return jsonify({
            "success": False,
            "error": "Missing required API key pool. Please provide at least one key."
        }), 400

    try:
        final_answer, process_history = start_imars_refinement(user_prompt, api_keys_pool)
        
        if final_answer is None:
             # 如果 final_answer 是 None，將流程日誌返回
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
        # 打印未捕獲的錯誤到 Render log
        print(f"Unhandled Error during distillation: {e}")
        return jsonify({"error": f"Internal distillation error: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
