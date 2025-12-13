// ============================================
// AI Fusion Pro - 完整前端JavaScript
// ============================================

// 配置設定
const CONFIG = {
    // 後端API URL（動態檢測）
    getBackendUrl: function() {
        // 如果是Render部署的網站
        if (window.location.hostname.includes('onrender.com')) {
            return 'https://ai-fusion-api.onrender.com/api';
        }
        // 本地開發
        return 'http://localhost:10000/api';
    },
    
    // 方案配置
    plans: {
        free: { 
            maxApis: 3, 
            requests: 100, 
            price: 0,
            name: '免費版',
            color: '#3B82F6'
        },
        pro: { 
            maxApis: 6, 
            requests: '無限', 
            price: 19,
            name: '專業版',
            color: '#10B981'
        },
        enterprise: { 
            maxApis: 10, 
            requests: '無限', 
            price: 49,
            name: '企業版',
            color: '#8B5CF6'
        }
    },
    
    // 支持的AI API
    apis: [
        { 
            id: 'openai', 
            name: 'OpenAI GPT', 
            icon: '🤖', 
            color: '#74AA9C', 
            description: 'GPT-3.5/4 模型',
            website: 'https://openai.com',
            costPer1K: 0.002
        },
        { 
            id: 'deepseek', 
            name: 'DeepSeek', 
            icon: '🔍', 
            color: '#4ECDC4', 
            description: '免費中文AI',
            website: 'https://deepseek.com',
            costPer1K: 0
        },
        { 
            id: 'gemini', 
            name: 'Google Gemini', 
            icon: '🌐', 
            color: '#4285F4', 
            description: 'Google最新AI',
            website: 'https://gemini.google.com',
            costPer1K: 0.00125
        },
        { 
            id: 'claude', 
            name: 'Claude AI', 
            icon: '👨‍💼', 
            color: '#D4A574', 
            description: 'Anthropic Claude',
            website: 'https://claude.ai',
            costPer1K: 0.001
        },
        { 
            id: 'grok', 
            name: 'Grok', 
            icon: '🚀', 
            color: '#FF6B6B', 
            description: 'xAI Grok',
            website: 'https://x.ai',
            costPer1K: 0.0015
        },
        { 
            id: 'cohere', 
            name: 'Cohere', 
            icon: '💬', 
            color: '#FFD166', 
            description: '企業級AI',
            website: 'https://cohere.com',
            costPer1K: 0.0015
        },
        { 
            id: 'mistral', 
            name: 'Mistral AI', 
            icon: '💨', 
            color: '#9B59B6', 
            description: '歐洲開源AI',
            website: 'https://mistral.ai',
            costPer1K: 0.0008
        },
        { 
            id: 'llama', 
            name: 'Llama 2', 
            icon: '🦙', 
            color: '#E74C3C', 
            description: 'Meta開源模型',
            website: 'https://llama.meta.com',
            costPer1K: 0.0005
        },
        { 
            id: 'chatglm', 
            name: 'ChatGLM', 
            icon: '🇨🇳', 
            color: '#2ECC71', 
            description: '清華大學AI',
            website: 'https://chatglm.cn',
            costPer1K: 0.0007
        },
        { 
            id: 'yi', 
            name: '零一萬物', 
            icon: '🎯', 
            color: '#3498DB', 
            description: '01.AI模型',
            website: 'https://01.ai',
            costPer1K: 0.0006
        }
    ]
};

// 應用狀態
let appState = {
    user: {
        plan: 'free',
        apiKeys: {},
        selectedApis: [],
        usage: {
            requests: 0,
            lastRequest: null,
            monthlyLimit: 100,
            resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
    },
    currentResults: null,
    systemStatus: 'online'
};

// ============================================
// 初始化函數
// ============================================

// 頁面加載完成後執行
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI Fusion Pro 正在初始化...');
    
    // 初始化應用
    initApp();
    
    // 檢查後端狀態
    checkBackendStatus();
    
    // 設置事件監聽器
    setupEventListeners();
    
    // 更新UI
    updateUI();
});

// 初始化應用
function initApp() {
    // 加載用戶數據
    loadUserData();
    
    // 渲染API選擇網格
    renderApiGrid();
    
    // 渲染API列表
    renderApiList();
    
    // 更新使用統計
    updateUsageDisplay();
    
    // 更新方案顯示
    updatePlanDisplay();
    
    console.log('應用初始化完成');
}

// 加載用戶數據
function loadUserData() {
    try {
        // 從localStorage加載狀態
        const savedState = localStorage.getItem('ai_fusion_state');
        if (savedState) {
            const state = JSON.parse(savedState);
            appState.user = { ...appState.user, ...state.user };
        }
        
        // 加載API密鑰
        const savedKeys = localStorage.getItem('ai_fusion_keys');
        if (savedKeys) {
            appState.user.apiKeys = JSON.parse(savedKeys);
            
            // 更新輸入框顯示（掩碼）
            Object.keys(appState.user.apiKeys).forEach(key => {
                const input = document.getElementById(key + 'Key');
                if (input && appState.user.apiKeys[key]) {
                    input.value = '••••••••';
                }
            });
        }
        
        console.log('用戶數據加載成功');
    } catch (error) {
        console.error('加載用戶數據失敗:', error);
        showNotification('加載用戶數據失敗，已重置為默認設置', 'warning');
    }
}

// 保存用戶數據
function saveUserData() {
    try {
        localStorage.setItem('ai_fusion_state', JSON.stringify({
            user: {
                plan: appState.user.plan,
                selectedApis: appState.user.selectedApis,
                usage: appState.user.usage
            }
        }));
    } catch (error) {
        console.error('保存用戶數據失敗:', error);
    }
}

// ============================================
// API密鑰管理
// ============================================

// 保存API密鑰
function saveAPIKeys() {
    // 收集所有API密鑰
    let hasNewKeys = false;
    
    CONFIG.apis.forEach(api => {
        const input = document.getElementById(api.id + 'Key');
        if (input && input.value && !input.value.startsWith('••••••••')) {
            appState.user.apiKeys[api.id] = input.value;
            input.value = '••••••••';
            hasNewKeys = true;
        }
    });
    
    if (hasNewKeys) {
        // 保存到localStorage
        localStorage.setItem('ai_fusion_keys', JSON.stringify(appState.user.apiKeys));
        
        // 重新渲染API網格
        renderApiGrid();
        
        // 顯示成功通知
        showNotification('API密鑰已加密保存到本地瀏覽器', 'success');
        
        // 檢查後端連接
        setTimeout(checkBackendStatus, 1000);
    } else {
        showNotification('未檢測到新的API密鑰', 'info');
    }
}

// 顯示API密鑰幫助
function showKeyHelp() {
    const helpHTML = `
        <div style="text-align: left; padding: 10px;">
            <h4>如何獲取API密鑰？</h4>
            
            <p><strong>1. OpenAI GPT (推薦)：</strong></p>
            <ul>
                <li>訪問：<a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com/api-keys</a></li>
                <li>註冊/登入帳號</li>
                <li>點擊「Create new secret key」</li>
                <li>複製密鑰（格式：sk-...）</li>
                <li>費用：$0.002/1K tokens</li>
            </ul>
            
            <p><strong>2. DeepSeek (免費)：</strong></p>
            <ul>
                <li>訪問：<a href="https://platform.deepseek.com" target="_blank">platform.deepseek.com</a></li>
                <li>註冊帳號</li>
                <li>點擊「API Keys」</li>
                <li>創建新密鑰</li>
                <li>完全免費使用！</li>
            </ul>
            
            <p><strong>3. Google Gemini：</strong></p>
            <ul>
                <li>訪問：<a href="https://makersuite.google.com/app/apikey" target="_blank">makersuite.google.com/app/apikey</a></li>
                <li>登入Google帳號</li>
                <li>創建API密鑰</li>
                <li>格式：AIza...</li>
            </ul>
            
            <p><strong>4. Claude AI：</strong></p>
            <ul>
                <li>訪問：<a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a></li>
                <li>註冊帳號</li>
                <li>獲取API密鑰</li>
                <li>格式：sk-ant-...</li>
            </ul>
            
            <p><strong>⚠️ 重要提醒：</strong></p>
            <ul>
                <li>API密鑰僅在您的瀏覽器本地存儲</li>
                <li>請勿分享您的API密鑰給他人</li>
                <li>定期更換密鑰以確保安全</li>
                <li>注意各API服務商的費用標準</li>
            </ul>
        </div>
    `;
    
    // 使用SweetAlert顯示幫助
    Swal.fire({
        title: 'API密鑰獲取指南',
        html: helpHTML,
        width: 700,
        confirmButtonText: '我明白了',
        confirmButtonColor: '#4361ee'
    });
}

// ============================================
// API選擇功能
// ============================================

// 渲染API選擇網格
function renderApiGrid() {
    const grid = document.getElementById('apiGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const maxApis = CONFIG.plans[appState.user.plan].maxApis;
    document.getElementById('maxApis').textContent = maxApis;
    
    CONFIG.apis.forEach(api => {
        const isSelected = appState.user.selectedApis.includes(api.id);
        const hasKey = !!appState.user.apiKeys[api.id] || api.id === 'deepseek';
        const canSelect = appState.user.selectedApis.length < maxApis || isSelected;
        
        const option = document.createElement('div');
        option.className = `api-option ${isSelected ? 'selected' : ''} ${hasKey ? 'has-key' : 'no-key'} ${!canSelect ? 'disabled' : ''}`;
        option.dataset.apiId = api.id;
        
        option.innerHTML = `
            <span class="api-icon">${api.icon}</span>
            <span class="api-name">${api.name}</span>
            <span class="api-description">${api.description}</span>
            <span class="key-status">
                ${hasKey ? '🔐 密鑰已設' : '❌ 需密鑰'}
            </span>
        `;
        
        if (canSelect) {
            option.onclick = () => toggleApiSelection(api.id);
        } else {
            option.onclick = () => showUpgradePrompt();
        }
        
        grid.appendChild(option);
    });
}

// 渲染API列表（用於功能展示）
function renderApiList() {
    const apiListContainer = document.querySelector('.features-grid');
    if (!apiListContainer) return;
    
    // 只顯示前4個API作為示例
    const displayApis = CONFIG.apis.slice(0, 4);
    
    apiListContainer.innerHTML = displayApis.map(api => `
        <div class="feature-card">
            <div class="feature-icon">${api.icon}</div>
            <h3>${api.name}</h3>
            <p>${api.description}</p>
            <div class="api-cost">
                <small>約 $${api.costPer1K}/1K tokens</small>
            </div>
        </div>
    `).join('');
}

// 切換API選擇
function toggleApiSelection(apiId) {
    const index = appState.user.selectedApis.indexOf(apiId);
    const maxApis = CONFIG.plans[appState.user.plan].maxApis;
    
    if (index > -1) {
        // 取消選擇
        appState.user.selectedApis.splice(index, 1);
    } else {
        // 檢查配額
        if (appState.user.selectedApis.length >= maxApis) {
            showUpgradePrompt();
            return;
        }
        
        // 檢查API密鑰
        const apiInfo = CONFIG.apis.find(a => a.id === apiId);
        if (!appState.user.apiKeys[apiId] && apiId !== 'deepseek') {
            showMissingKeyPrompt(apiInfo);
            return;
        }
        
        appState.user.selectedApis.push(apiId);
    }
    
    // 更新UI
    renderApiGrid();
    saveUserData();
    updateUsageDisplay();
}

// 顯示缺少密鑰提示
function showMissingKeyPrompt(apiInfo) {
    Swal.fire({
        title: '缺少API密鑰',
        html: `
            <p>您尚未設置 <strong>${apiInfo.name}</strong> 的API密鑰。</p>
            <p>請先獲取並設置API密鑰，或選擇其他已設置密鑰的AI服務。</p>
            <div style="margin-top: 20px; text-align: left;">
                <p><strong>如何獲取：</strong></p>
                <p>1. 訪問 ${apiInfo.website}</p>
                <p>2. 註冊帳號</p>
                <p>3. 獲取API密鑰</p>
                <p>4. 在本站設置中輸入</p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '去設置密鑰',
        cancelButtonText: '取消',
        confirmButtonColor: '#4361ee'
    }).then((result) => {
        if (result.isConfirmed) {
            // 滾動到API設置區域
            document.querySelector('.api-keys').scrollIntoView({ 
                behavior: 'smooth' 
            });
        }
    });
}

// 顯示升級提示
function showUpgradePrompt() {
    const currentPlan = CONFIG.plans[appState.user.plan];
    const nextPlan = appState.user.plan === 'free' ? 'pro' : 'enterprise';
    const nextPlanInfo = CONFIG.plans[nextPlan];
    
    Swal.fire({
        title: '配額不足',
        html: `
            <p>您的 <strong>${currentPlan.name}</strong> 方案最多支持 ${currentPlan.maxApis} 個API。</p>
            <p>升級到 <strong>${nextPlanInfo.name}</strong> 可使用 ${nextPlanInfo.maxApis} 個API。</p>
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                <p><strong>${nextPlanInfo.name} 方案：</strong></p>
                <p>💵 價格：$${nextPlanInfo.price}/月</p>
                <p>🔌 API配額：${nextPlanInfo.maxApis} 個</p>
                <p>🔄 請求次數：${nextPlanInfo.requests}</p>
            </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: '立即升級',
        cancelButtonText: '取消',
        confirmButtonColor: '#10B981'
    }).then((result) => {
        if (result.isConfirmed) {
            selectPlan(nextPlan);
            document.getElementById('pricing').scrollIntoView({ 
                behavior: 'smooth' 
            });
        }
    });
}

// ============================================
// 方案管理
// ============================================

// 選擇方案
function selectPlan(plan) {
    if (!document.getElementById('agreeCheckbox')?.checked) {
        showNotification('請先同意服務條款', 'error');
        return;
    }
    
    // 更新方案
    appState.user.plan = plan;
    
    // 調整已選API數量
    const maxApis = CONFIG.plans[plan].maxApis;
    if (appState.user.selectedApis.length > maxApis) {
        appState.user.selectedApis = appState.user.selectedApis.slice(0, maxApis);
    }
    
    // 保存並更新UI
    saveUserData();
    renderApiGrid();
    updatePlanDisplay();
    updateUsageDisplay();
    
    // 顯示成功通知
    const planName = CONFIG.plans[plan].name;
    showNotification(`已切換到 ${planName} 方案`, 'success');
}

// 更新方案顯示
function updatePlanDisplay() {
    const plan = appState.user.plan;
    const planInfo = CONFIG.plans[plan];
    
    // 更新方案指示器
    const planIndicators = document.querySelectorAll('.plan-indicator');
    planIndicators.forEach(indicator => {
        if (indicator.dataset.plan === plan) {
            indicator.style.display = 'inline-block';
        } else {
            indicator.style.display = 'none';
        }
    });
}

// 開始免費試用
function startFreeTrial() {
    // 設置為免費方案
    appState.user.plan = 'free';
    
    // 自動選擇3個推薦API
    const recommendedApis = ['deepseek', 'openai', 'gemini'];
    appState.user.selectedApis = recommendedApis.filter(apiId => 
        appState.user.apiKeys[apiId] || apiId === 'deepseek'
    ).slice(0, 3);
    
    // 保存並更新UI
    saveUserData();
    renderApiGrid();
    updatePlanDisplay();
    
    // 顯示成功通知
    showNotification('免費試用已啟用！可使用3個AI服務', 'success');
    
    // 滾動到演示區
    scrollToDemo();
}

// ============================================
// 主要處理功能
// ============================================

// 開始AI處理
async function startProcessing() {
    // 檢查條款同意
    if (!document.getElementById('agreeCheckbox')?.checked) {
        showNotification('請先閱讀並同意服務條款', 'error');
        return;
    }
    
    // 檢查API選擇
    if (appState.user.selectedApis.length === 0) {
        showNotification('請至少選擇一個AI服務', 'warning');
        return;
    }
    
    // 檢查使用限制（免費版）
    if (appState.user.plan === 'free' && 
        appState.user.usage.requests >= appState.user.usage.monthlyLimit) {
        showNotification('免費版每月請求次數已用完，請升級方案', 'warning');
        return;
    }
    
    // 獲取輸入內容
    const prompt = document.getElementById('prompt')?.value.trim();
    if (!prompt) {
        showNotification('請輸入問題內容', 'warning');
        return;
    }
    
    // 檢查API密鑰
    const missingKeys = [];
    appState.user.selectedApis.forEach(apiId => {
        if (!appState.user.apiKeys[apiId] && apiId !== 'deepseek') {
            const apiInfo = CONFIG.apis.find(a => a.id === apiId);
            missingKeys.push(apiInfo.name);
        }
    });
    
    if (missingKeys.length > 0) {
        const result = await Swal.fire({
            title: '缺少API密鑰',
            html: `
                <p>以下AI服務缺少API密鑰：</p>
                <p><strong>${missingKeys.join(', ')}</strong></p>
                <p>是否繼續使用可用的API服務？</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '繼續',
            cancelButtonText: '取消',
            confirmButtonColor: '#4361ee'
        });
        
        if (!result.isConfirmed) return;
    }
    
    // 禁用按鈕，顯示加載狀態
    const processBtn = document.getElementById('processBtn');
    const originalHTML = processBtn.innerHTML;
    processBtn.disabled = true;
    processBtn.innerHTML = `
        <span class="btn-icon">⏳</span>
        <span class="btn-text">處理中...</span>
    `;
    
    // 準備請求數據
    const requestData = {
        prompt: prompt,
        apis: appState.user.selectedApis,
        temperature: parseFloat(document.getElementById('temperature')?.value || 0.7),
        maxTokens: parseInt(document.getElementById('maxTokens')?.value || 1000),
        apiKeys: appState.user.apiKeys,
        userPlan: appState.user.plan
    };
    
    try {
        // 獲取後端URL
        const backendUrl = CONFIG.getBackendUrl();
        
        console.log('發送請求到後端:', {
            url: backendUrl + '/distill',
            apis: requestData.apis,
            promptLength: prompt.length
        });
        
        // 發送請求
        const response = await fetch(backendUrl + '/distill', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        // 檢查響應狀態
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        // 解析響應數據
        const data = await response.json();
        
        if (data.success) {
            // 更新使用統計
            appState.user.usage.requests++;
            appState.user.usage.lastRequest = new Date();
            saveUserData();
            updateUsageDisplay();
            
            // 顯示結果
            displayResults(data);
            
            // 檢查系統狀態
            appState.systemStatus = 'online';
        } else {
            throw new Error(data.error || '請求失敗');
        }
        
    } catch (error) {
        console.error('API請求錯誤:', error);
        
        // 如果後端失敗，使用模擬數據
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('Network Error')) {
            
            showNotification('後端服務暫時不可用，使用模擬模式', 'warning');
            appState.systemStatus = 'offline';
            
            // 生成模擬結果
            const mockData = generateMockResults(requestData);
            setTimeout(() => {
                displayResults(mockData);
                processBtn.disabled = false;
                processBtn.innerHTML = originalHTML;
            }, 1500);
            
        } else {
            showNotification(`處理失敗: ${error.message}`, 'error');
            processBtn.disabled = false;
            processBtn.innerHTML = originalHTML;
        }
        return;
    }
    
    // 恢復按鈕
    processBtn.disabled = false;
    processBtn.innerHTML = originalHTML;
}

// 生成模擬結果（後備方案）
function generateMockResults(requestData) {
    const responses = {};
    let totalCost = 0;
    let totalLatency = 0;
    let successCount = 0;
    
    requestData.apis.forEach(apiId => {
        const apiInfo = CONFIG.apis.find(a => a.id === apiId);
        const hasKey = !!appState.user.apiKeys[apiId] || apiId === 'deepseek';
        const success = hasKey && Math.random() > 0.1; // 90%成功率如果有密鑰
        
        const latency = Math.floor(300 + Math.random() * 700);
        const tokens = Math.floor(200 + Math.random() * 300);
        const cost = success ? tokens * (apiInfo.costPer1K || 0.001) : 0;
        
        responses[apiId] = {
            success: success,
            content: success ? generateMockResponse(requestData.prompt, apiInfo) : '',
            latency: latency,
            tokens: tokens,
            cost: cost,
            error: success ? null : hasKey ? 'API請求失敗' : '缺少API密鑰',
            model: apiId === 'openai' ? 'gpt-3.5-turbo' : 
                   apiId === 'deepseek' ? 'deepseek-chat' : 
                   apiId === 'gemini' ? 'gemini-pro' : apiId,
            apiName: apiInfo.name,
            apiIcon: apiInfo.icon
        };
        
        if (success) {
            totalCost += cost;
            totalLatency += latency;
            successCount++;
        }
    });
    
    // 生成融合結果
    const successfulResponses = Object.values(responses).filter(r => r.success);
    const fusedContent = generateFusedResponse(requestData.prompt, successfulResponses);
    
    return {
        success: true,
        task_id: `mock_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_plan: requestData.userPlan,
        api_responses: responses,
        fused_response: {
            content: fusedContent,
            sources: requestData.apis.filter(api => responses[api]?.success),
            confidence: successCount / requestData.apis.length,
            method: 'weighted_fusion'
        },
        statistics: {
            total_apis: requestData.apis.length,
            successful_apis: successCount,
            total_cost: totalCost.toFixed(6),
            avg_latency: successCount > 0 ? Math.round(totalLatency / successCount) : 0,
            total_time: 500 + Math.random() * 500
        }
    };
}

// 生成模擬回應
function generateMockResponse(prompt, apiInfo) {
    const templates = [
        `根據 ${apiInfo.name} 的分析：${prompt}\n\n這是一個重要的問題。從技術角度來看，涉及多個層面的考量。當前的主流解決方案包括...`,
        
        `${apiInfo.name} 回應：關於「${prompt}」\n\n這個問題的核心在於理解基本概念。首先，我們需要明確定義。其次，分析影響因素。最後，展望未來發展。`,
        
        `${apiInfo.icon} ${apiInfo.name} 分析結果：\n${prompt}\n\n經過計算分析，我認為有以下幾個關鍵點：\n1. 第一點...\n2. 第二點...\n3. 第三點...`,
        
        `以下是 ${apiInfo.name} 的專業分析：\n"${prompt}"\n\n這個話題在當前技術發展中具有重要意義。從歷史演變到現狀分析，再到未來趨勢，都有深入研究的價值。`
    ];
    
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    const insights = [
        '需要注意的是，這是一個快速發展的領域。',
        '實際應用中需要考慮具體場景。',
        '不同行業可能有不同的實現方式。',
        '這只是初步分析，具體情況需要更多數據支持。'
    ];
    
    const randomInsight = insights[Math.floor(Math.random() * insights.length)];
    
    return randomTemplate + '\n\n' + randomInsight;
}

// 生成融合回應
function generateFusedResponse(prompt, responses) {
    if (responses.length === 0) {
        return '❌ 所有API調用失敗，請檢查API密鑰和網絡連接';
    }
    
    if (responses.length === 1) {
        return `🎯 單一AI分析（${responses[0].apiName}）：\n\n${responses[0].content}`;
    }
    
    const apiNames = responses.map(r => r.apiName).join('、');
    const totalTokens = responses.reduce((sum, r) => sum + r.tokens, 0);
    const avgLatency = Math.round(responses.reduce((sum, r) => sum + r.latency, 0) / responses.length);
    
    let fusedContent = `🧠 智能融合結果（基於 ${responses.length} 個AI分析：${apiNames}）\n\n`;
    fusedContent += `用戶問題：「${prompt}」\n\n`;
    fusedContent += `📊 綜合分析：\n\n`;
    
    // 取每個回應的第一段作為摘要
    responses.forEach((response, index) => {
        const firstSentence = response.content.split('。')[0] + '。';
        fusedContent += `${index + 1}. ${response.apiIcon} ${response.apiName}：${firstSentence}\n`;
    });
    
    fusedContent += `\n💡 核心結論：\n`;
    fusedContent += `綜合以上AI分析，${prompt.split('？')[0] || '這個問題'}的主要觀點包括...\n\n`;
    
    fusedContent += `📈 性能統計：\n`;
    fusedContent += `• 總Tokens：${totalTokens}\n`;
    fusedContent += `• 平均延遲：${avgLatency}ms\n`;
    fusedContent += `• 置信度：${(responses.length / appState.user.selectedApis.length * 100).toFixed(1)}%\n`;
    fusedContent += `• 融合算法：智能加權\n`;
    
    return fusedContent;
}

// ============================================
// 結果顯示功能
// ============================================

// 顯示處理結果
function displayResults(data) {
    const resultsSection = document.getElementById('results');
    const resultsGrid = document.getElementById('resultsGrid');
    const fusedContent = document.getElementById('fusedContent');
    
    if (!resultsSection || !resultsGrid || !fusedContent) return;
    
    // 顯示結果區域
    resultsSection.style.display = 'block';
    
    // 更新統計數據
    if (data.statistics) {
        const stats = data.statistics;
        document.getElementById('totalCost').textContent = `$${stats.total_cost}`;
        document.getElementById('avgLatency').textContent = `${stats.avg_latency}ms`;
        document.getElementById('successCount').textContent = `${stats.successful_apis}/${stats.total_apis}`;
    }
    
    // 顯示融合結果
    if (data.fused_response) {
        const fused = data.fused_response;
        fusedContent.innerHTML = `
            <div class="fused-header">
                <div class="fused-meta">
                    <span class="fusion-method">${fused.method || '智能融合'}</span>
                    <span class="confidence">置信度: ${(fused.confidence * 100).toFixed(1)}%</span>
                    <span class="sources">來源: ${fused.sources?.map(s => 
                        CONFIG.apis.find(a => a.id === s)?.name || s
                    ).join(', ') || '未知'}</span>
                </div>
            </div>
            <div class="fused-body">
                ${fused.content.replace(/\n/g, '<br>')}
            </div>
        `;
    }
    
    // 顯示各API詳細結果
    resultsGrid.innerHTML = '';
    if (data.api_responses) {
        Object.entries(data.api_responses).forEach(([apiId, response]) => {
            const apiInfo = CONFIG.apis.find(a => a.id === apiId);
            const card = document.createElement('div');
            card.className = `result-card ${response.success ? 'success' : 'error'}`;
            
            const costColor = response.cost > 0.001 ? '#dc3545' : 
                            response.cost > 0 ? '#ffc107' : '#28a745';
            
            card.innerHTML = `
                <div class="result-header">
                    <div class="api-name">
                        <span class="api-icon">${apiInfo?.icon || '🤖'}</span>
                        <span class="api-name-text">${apiInfo?.name || apiId}</span>
                        ${response.model ? `<span class="model-tag">${response.model}</span>` : ''}
                    </div>
                    <span class="api-cost" style="color: ${costColor};">
                        $${response.cost?.toFixed(6) || '0.000000'}
                    </span>
                </div>
                <div class="result-content">
                    ${response.success ? 
                        `<p>${response.content.substring(0, 200)}${response.content.length > 200 ? '...' : ''}</p>` :
                        `<p class="error-text"><strong>❌ 錯誤：</strong> ${response.error || '未知錯誤'}</p>`
                    }
                </div>
                <div class="result-meta">
                    <span class="latency">⏱️ ${response.latency || 0}ms</span>
                    <span class="tokens">📝 ${response.tokens || 0} tokens</span>
                    <span class="status ${response.success ? 'success' : 'error'}">
                        ${response.success ? '✅ 成功' : '❌ 失敗'}
                    </span>
                </div>
            `;
            
            resultsGrid.appendChild(card);
        });
    }
    
    // 保存當前結果
    appState.currentResults = data;
    
    // 滾動到結果區域
    setTimeout(() => {
        resultsSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }, 100);
}

// 下載結果
function downloadResults() {
    if (!appState.currentResults) {
        showNotification('沒有可下載的結果', 'warning');
        return;
    }
    
    const data = {
        title: 'AI Fusion Pro 分析報告',
        timestamp: new Date().toISOString(),
        prompt: document.getElementById('prompt')?.value || '',
        user_plan: appState.user.plan,
        selected_apis: appState.user.selectedApis,
        results: appState.currentResults,
        statistics: {
            total_requests: appState.user.usage.requests,
            monthly_limit: appState.user.usage.monthlyLimit,
            requests_left: appState.user.usage.monthlyLimit - appState.user.usage.requests
        }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-fusion-results-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('結果已下載為JSON檔案', 'success');
}

// 分享結果
function shareResults() {
    if (!appState.currentResults) {
        showNotification('沒有可分享的結果', 'warning');
        return;
    }
    
    const prompt = document.getElementById('prompt')?.value || '';
    const successfulApis = appState.currentResults.statistics?.successful_apis || 0;
    const totalApis = appState.currentResults.statistics?.total_apis || 0;
    
    const shareText = `🎯 AI Fusion Pro 分析結果\n\n` +
                     `問題：${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}\n` +
                     `使用 ${successfulApis}/${totalApis} 個AI服務\n` +
                     `查看完整結果：${window.location.href}\n\n` +
                     `#AI #人工智慧 #AIFusion`;
    
    if (navigator.share) {
        navigator.share({
            title: 'AI Fusion Pro 分析結果',
            text: shareText,
            url: window.location.href
        }).catch(() => {
            // 分享失敗，使用複製到剪貼簿
            copyToClipboard(shareText);
        });
    } else {
        copyToClipboard(shareText);
    }
}

// 複製到剪貼簿
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('結果連結已複製到剪貼簿', 'success');
    }).catch(() => {
        showNotification('複製失敗，請手動複製', 'error');
    });
}

// 清除結果
function clearResults() {
    const resultsSection = document.getElementById('results');
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }
    
    appState.currentResults = null;
    
    // 清空輸入框
    const promptInput = document.getElementById('prompt');
    if (promptInput) {
        promptInput.value = '';
    }
    
    showNotification('結果已清除', 'info');
}

// ============================================
// 系統功能
// ============================================

// 檢查後端狀態
async function checkBackendStatus() {
    try {
        const backendUrl = CONFIG.getBackendUrl();
        const response = await fetch(backendUrl + '/health', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('後端狀態:', data);
            appState.systemStatus = 'online';
            updateSystemStatus('✅ 系統正常');
        } else {
            throw new Error('後端健康檢查失敗');
        }
    } catch (error) {
        console.warn('後端連接失敗:', error.message);
        appState.systemStatus = 'offline';
        updateSystemStatus('⚠️ 後端離線（使用模擬模式）');
    }
}

// 更新系統狀態顯示
function updateSystemStatus(message) {
    const statusElement = document.getElementById('systemStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = appState.systemStatus === 'online' ? 
            'status-online' : 'status-offline';
    }
}

// 更新使用統計顯示
function updateUsageDisplay() {
    const usage = appState.user.usage;
    const plan = CONFIG.plans[appState.user.plan];
    
    // 計算使用百分比
    const used = usage.requests;
    const limit = plan.requests === '無限' ? used + 100 : usage.monthlyLimit;
    const percentage = Math.min((used / limit) * 100, 100);
    
    // 更新使用進度條
    const progressBar = document.querySelector('.usage-progress');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.style.backgroundColor = percentage > 90 ? '#dc3545' : 
                                          percentage > 70 ? '#ffc107' : '#28a745';
    }
    
    // 更新計數顯示
    const countElement = document.getElementById('requestCount');
    if (countElement) {
        countElement.textContent = used;
    }
    
    const limitElement = document.getElementById('requestLimit');
    if (limitElement) {
        limitElement.textContent = plan.requests === '無限' ? '∞' : limit;
    }
    
    // 更新重置時間
    const resetElement = document.getElementById('resetTime');
    if (resetElement && plan.requests !== '無限') {
        const daysLeft = Math.ceil((usage.resetDate - new Date()) / (1000 * 60 * 60 * 24));
        resetElement.textContent = `${daysLeft}天後重置`;
    }
}

// 更新UI
function updateUI() {
    updateUsageDisplay();
    updatePlanDisplay();
    updateSystemStatus(appState.systemStatus === 'online' ? 
        '✅ 系統正常' : '⚠️ 後端離線');
}

// ============================================
// 事件監聽器設置
// ============================================

// 設置事件監聽器
function setupEventListeners() {
    // 溫度滑塊
    const tempSlider = document.getElementById('temperature');
    const tempValue = document.getElementById('tempValue');
    if (tempSlider && tempValue) {
        tempSlider.addEventListener('input', function() {
            tempValue.textContent = this.value;
        });
    }
    
    // Token滑塊
    const tokenSlider = document.getElementById('maxTokens');
    const tokenValue = document.getElementById('tokenValue');
    if (tokenSlider && tokenValue) {
        tokenSlider.addEventListener('input', function() {
            tokenValue.textContent = this.value;
        });
    }
    
    // 融合策略選擇
    const strategySelect = document.getElementById('fusionStrategy');
    if (strategySelect) {
        strategySelect.addEventListener('change', function() {
            console.log('融合策略更改為:', this.value);
        });
    }
    
    // 條款同意檢查
    const agreeCheckbox = document.getElementById('agreeCheckbox');
    if (agreeCheckbox) {
        agreeCheckbox.addEventListener('change', function() {
            if (this.checked) {
                console.log('用戶同意服務條款');
            }
        });
    }
    
    // 快速開始按鈕
    const quickStartBtn = document.querySelector('.btn-quick-start');
    if (quickStartBtn) {
        quickStartBtn.addEventListener('click', startFreeTrial);
    }
    
    // 輸入框自動調整高度
    const promptInput = document.getElementById('prompt');
    if (promptInput) {
        promptInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
    
    // 鍵盤快捷鍵：Ctrl+Enter 開始處理
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const promptInput = document.getElementById('prompt');
            if (promptInput && document.activeElement === promptInput) {
                e.preventDefault();
                startProcessing();
            }
        }
    });
}

// ============================================
// 導航和工具函數
// ============================================

// 滾動到演示區
function scrollToDemo() {
    const demoSection = document.getElementById('demo');
    if (demoSection) {
        demoSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// 顯示登入對話框
function showLogin() {
    Swal.fire({
        title: '登入 AI Fusion Pro',
        html: `
            <div style="text-align: left;">
                <p>目前所有功能都可直接使用，無需註冊！</p>
                <p><strong>未來版本將加入：</strong></p>
                <ul>
                    <li>用戶帳號系統</li>
                    <li>歷史記錄保存</li>
                    <li>團隊協作功能</li>
                    <li>個人化設置</li>
                </ul>
            </div>
        `,
        icon: 'info',
        confirmButtonText: '明白了',
        confirmButtonColor: '#4361ee'
    });
}

// 顯示通知
function showNotification(message, type = 'info') {
    // 創建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // 設置圖標
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '❌';
    
    notification.innerHTML = `
        <span class="notification-icon">${icon}</span>
        <span class="notification-text">${message}</span>
    `;
    
    // 添加到頁面
    document.body.appendChild(notification);
    
    // 顯示動畫
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 自動移除
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
    
    // 點擊關閉
    notification.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    });
}

// ============================================
// 添加通知樣式
// ============================================

// 創建通知樣式
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 9999;
    transform: translateX(120%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    max-width: 400px;
    min-width: 300px;
    border-left: 4px solid #4361ee;
}

.notification.show {
    transform: translateX(0);
}

.notification-success {
    border-left-color: #28a745;
}

.notification-warning {
    border-left-color: #ffc107;
}

.notification-error {
    border-left-color: #dc3545;
}

.notification-info {
    border-left-color: #17a2b8;
}

.notification-icon {
    font-size: 20px;
}

.notification-text {
    flex: 1;
    font-size: 14px;
    line-height: 1.4;
}

/* 響應式調整 */
@media (max-width: 768px) {
    .notification {
        left: 20px;
        right: 20px;
        max-width: none;
        min-width: auto;
    }
}
`;

// 添加到文檔頭部
document.head.appendChild(notificationStyle);

// ============================================
// 導出函數供HTML調用
// ============================================

// 將函數暴露給全局作用域
window.saveAPIKeys = saveAPIKeys;
window.showKeyHelp = showKeyHelp;
window.toggleApiSelection = toggleApiSelection;
window.selectPlan = selectPlan;
window.startProcessing = startProcessing;
window.startFreeTrial = startFreeTrial;
window.scrollToDemo = scrollToDemo;
window.showLogin = showLogin;
window.downloadResults = downloadResults;
window.shareResults = shareResults;
window.clearResults = clearResults;

console.log('✅ script.js 加載完成！');
