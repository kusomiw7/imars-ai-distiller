// 配置設定
const CONFIG = {
    plans: {
        free: { maxApis: 3, requests: 100, price: 0 },
        pro: { maxApis: 6, requests: 'unlimited', price: 19 },
        enterprise: { maxApis: 10, requests: 'unlimited', price: 49 }
    },
    apis: [
        { id: 'openai', name: 'OpenAI GPT', icon: '🤖', color: '#74AA9C', defaultKey: '' },
        { id: 'deepseek', name: 'DeepSeek', icon: '🔍', color: '#4ECDC4', defaultKey: '' },
        { id: 'gemini', name: 'Google Gemini', icon: '🌐', color: '#4285F4', defaultKey: '' },
        { id: 'claude', name: 'Claude AI', icon: '👨‍💼', color: '#D4A574', defaultKey: '' },
        { id: 'grok', name: 'Grok AI', icon: '🚀', color: '#FF6B6B', defaultKey: '' },
        { id: 'cohere', name: 'Cohere', icon: '💬', color: '#FFD166', defaultKey: '' },
        { id: 'mistral', name: 'Mistral AI', icon: '💨', color: '#9B59B6', defaultKey: '' },
        { id: 'llama', name: 'Llama 2', icon: '🦙', color: '#E74C3C', defaultKey: '' },
        { id: 'chatglm', name: 'ChatGLM', icon: '🇨🇳', color: '#2ECC71', defaultKey: '' },
        { id: 'yi', name: '零一萬物', icon: '🎯', color: '#3498DB', defaultKey: '' }
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
            monthlyLimit: 100
        }
    },
    currentResults: null
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    loadUserData();
    renderApiGrid();
    setupEventListeners();
    updateUI();
}

function loadUserData() {
    // 從localStorage加載數據
    const savedState = localStorage.getItem('ai_fusion_state');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            appState.user = { ...appState.user, ...state.user };
        } catch (e) {
            console.error('加載用戶數據失敗:', e);
        }
    }

    // 加載API密鑰
    const savedKeys = localStorage.getItem('ai_fusion_keys');
    if (savedKeys) {
        try {
            appState.user.apiKeys = JSON.parse(savedKeys);
            Object.keys(appState.user.apiKeys).forEach(key => {
                const input = document.getElementById(key + 'Key');
                if (input && appState.user.apiKeys[key]) {
                    input.value = '••••••••';
                }
            });
        } catch (e) {
            console.error('加載API密鑰失敗:', e);
        }
    }

    // 更新UI
    updatePlanDisplay();
    updateUsageDisplay();
}

function saveUserData() {
    localStorage.setItem('ai_fusion_state', JSON.stringify({
        user: {
            plan: appState.user.plan,
            selectedApis: appState.user.selectedApis,
            usage: appState.user.usage
        }
    }));
}

function saveAPIKeys() {
    // 收集所有API密鑰
    CONFIG.apis.forEach(api => {
        const input = document.getElementById(api.id + 'Key');
        if (input && input.value && !input.value.startsWith('••••••••')) {
            appState.user.apiKeys[api.id] = input.value;
            input.value = '••••••••';
        }
    });

    // 保存到localStorage
    localStorage.setItem('ai_fusion_keys', JSON.stringify(appState.user.apiKeys));
    
    // 顯示成功消息
    showNotification('API密鑰已加密保存到本地瀏覽器', 'success');
    
    // 重新渲染API網格
    renderApiGrid();
}

function renderApiGrid() {
    const grid = document.getElementById('apiGrid');
    if (!grid) return;

    grid.innerHTML = '';
    
    const maxApis = CONFIG.plans[appState.user.plan].maxApis;
    document.getElementById('maxApis').textContent = maxApis;

    CONFIG.apis.forEach(api => {
        const isSelected = appState.user.selectedApis.includes(api.id);
        const hasKey = !!appState.user.apiKeys[api.id];
        const canSelect = appState.user.selectedApis.length < maxApis || isSelected;

        const option = document.createElement('div');
        option.className = `api-option ${isSelected ? 'selected' : ''} ${hasKey ? 'has-key' : ''} ${!canSelect ? 'disabled' : ''}`;
        option.onclick = () => canSelect && toggleApiSelection(api.id);
        
        option.innerHTML = `
            <span class="api-icon">${api.icon}</span>
            <span class="api-name">${api.name}</span>
            <span class="api-status">${hasKey ? '密鑰已設置' : '需要密鑰'}</span>
            <span class="key-status">${hasKey ? '✓' : '✗'}</span>
        `;

        grid.appendChild(option);
    });
}

function toggleApiSelection(apiId) {
    const index = appState.user.selectedApis.indexOf(apiId);
    const maxApis = CONFIG.plans[appState.user.plan].maxApis;

    if (index > -1) {
        // 取消選擇
        appState.user.selectedApis.splice(index, 1);
    } else {
        // 檢查配額
        if (appState.user.selectedApis.length >= maxApis) {
            showNotification(`您的方案最多支持 ${maxApis} 個API，請升級方案`, 'warning');
            return;
        }

        // 檢查API密鑰
        const apiInfo = CONFIG.apis.find(a => a.id === apiId);
        if (!appState.user.apiKeys[apiId] && apiId !== 'deepseek') {
            if (!confirm(`您尚未設置 ${apiInfo.name} 的API密鑰，是否繼續？`)) {
                return;
            }
        }

        appState.user.selectedApis.push(apiId);
    }

    renderApiGrid();
    saveUserData();
}

function selectPlan(plan) {
    if (!document.getElementById('agreeCheckbox')?.checked) {
        showNotification('請先同意服務條款', 'error');
        return;
    }

    appState.user.plan = plan;
    
    // 調整已選API數量
    const maxApis = CONFIG.plans[plan].maxApis;
    if (appState.user.selectedApis.length > maxApis) {
        appState.user.selectedApis = appState.user.selectedApis.slice(0, maxApis);
    }

    saveUserData();
    renderApiGrid();
    updatePlanDisplay();
    
    showNotification(`已切換到${plan === 'free' ? '免費' : plan === 'pro' ? '專業' : '企業'}方案`, 'success');
}

function startProcessing() {
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
    if (appState.user.plan === 'free' && appState.user.usage.requests >= appState.user.usage.monthlyLimit) {
        showNotification('免費版每月請求次數已用完，請升級方案', 'warning');
        return;
    }

    const prompt = document.getElementById('prompt')?.value.trim();
    if (!prompt) {
        showNotification('請輸入問題內容', 'warning');
        return;
    }

    // 更新按鈕狀態
    const processBtn = document.getElementById('processBtn');
    const originalText = processBtn.innerHTML;
    processBtn.disabled = true;
    processBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">處理中...</span>';

    // 準備請求數據
    const requestData = {
        prompt: prompt,
        apis: appState.user.selectedApis,
        temperature: parseFloat(document.getElementById('temperature')?.value || 0.7),
        maxTokens: parseInt(document.getElementById('maxTokens')?.value || 1000),
        strategy: document.getElementById('fusionStrategy')?.value || 'weighted',
        apiKeys: appState.user.apiKeys,
        userPlan: appState.user.plan
    };

    // 模擬處理（實際應該發送到後端API）
    simulateProcessing(requestData);
}

function simulateProcessing(requestData) {
    const processBtn = document.getElementById('processBtn');
    
    // 顯示模擬進度
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 10;
        processBtn.innerHTML = `<span class="btn-icon">⏳</span><span class="btn-text">處理中 ${progress}%</span>`;
        
        if (progress >= 100) {
            clearInterval(progressInterval);
            
            // 生成模擬結果
            const results = generateMockResults(requestData);
            displayResults(results);
            
            // 更新使用統計
            appState.user.usage.requests++;
            appState.user.usage.lastRequest = new Date();
            saveUserData();
            updateUsageDisplay();
            
            // 恢復按鈕
            processBtn.disabled = false;
            processBtn.innerHTML = '<span class="btn-icon">🚀</span><span class="btn-text">開始AI蒸餾處理</span>';
        }
    }, 200);
}

function generateMockResults(requestData) {
    const responses = {};
    let totalCost = 0;
    let totalLatency = 0;
    let successCount = 0;
    
    requestData.apis.forEach(apiId => {
        const hasKey = !!appState.user.apiKeys[apiId] || apiId === 'deepseek';
        const success = hasKey && Math.random() > 0.1; // 90%成功率如果有密鑰
        const latency = Math.floor(300 + Math.random() * 700);
        const tokens = Math.floor(200 + Math.random() * 300);
        const cost = success ? tokens * 0.000002 : 0;
        
        const apiInfo = CONFIG.apis.find(a => a.id === apiId);
        
        responses[apiId] = {
            success: success,
            content: success ? generateMockResponse(requestData.prompt, apiInfo.name) : '',
            latency: latency,
            tokens: tokens,
            cost: cost,
            error: success ? null : hasKey ? 'API請求失敗' : '缺少API密鑰',
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
    const fusedContent = successfulResponses.length > 0 
        ? generateFusedResponse(requestData.prompt, successfulResponses)
        : '所有API調用失敗，請檢查API密鑰和網絡連接';
    
    return {
        apiResponses: responses,
        fusedResponse: {
            content: fusedContent,
            sources: requestData.apis.filter(api => responses[api]?.success),
            confidence: successfulResponses.length / requestData.apis.length,
            method: requestData.strategy
        },
        statistics: {
            totalApis: requestData.apis.length,
            successfulApis: successCount,
            totalCost: totalCost.toFixed(6),
            avgLatency: successCount > 0 ? Math.round(totalLatency / successCount) : 0,
            totalTokens: Object.values(responses).reduce((sum, r) => sum + r.tokens, 0)
        }
    };
}

function generateMockResponse(prompt, apiName) {
    const responses = {
        'OpenAI GPT': `根據我的分析：${prompt}\n\n${apiName} 回應：這是一個涉及多個方面的問題。首先，我們需要理解核心概念，然後分析其應用場景。在實際應用中，這項技術正在改變我們的生活和工作方式。`,
        'DeepSeek': `DeepSeek分析結果：${prompt}\n\n這是一個重要的技術話題。當前發展趨勢顯示，這項技術在以下領域有廣泛應用：[具體應用領域]。未來的發展前景非常廣闊。`,
        'Google Gemini': `Gemini的回應：關於"${prompt}"\n\n這項技術的核心原理包括幾個關鍵要素。從歷史發展來看，它經歷了多個階段。目前的主要挑戰是[挑戰描述]，解決方案包括[解決方案]。`,
        'Claude AI': `Claude的分析：${prompt}\n\n這是一個複雜的問題，需要從多個角度考慮。從技術層面看，主要特點包括[特點]。從應用層面看，影響主要體現在[影響領域]。`
    };
    
    return responses[apiName] || `${apiName}回應：${prompt}\n\n這是一個重要的問題。根據我的知識庫，相關信息如下：[詳細解釋]。`;
}

function generateFusedResponse(prompt, responses) {
    if (responses.length === 0) return '無法生成融合結果';
    if (responses.length === 1) return responses[0].content;
    
    // 簡單的融合：取最長的回應
    const longestResponse = responses.reduce((longest, current) => 
        current.content.length > longest.content.length ? current : longest
    );
    
    return `🧠 智能融合結果（基於${responses.length}個AI分析）：\n\n${longestResponse.content}\n\n---\n✅ 融合算法：智能加權 | 置信度：${(responses.length / appState.user.selectedApis.length * 100).toFixed(1)}%`;
}

function displayResults(results) {
    const resultsSection = document.getElementById('results');
    const resultsGrid = document.getElementById('resultsGrid');
    const fusedContent = document.getElementById('fusedContent');
    
    // 顯示結果區域
    resultsSection.style.display = 'block';
    
    // 更新統計
    document.getElementById('totalCost').textContent = `$${results.statistics.totalCost}`;
    document.getElementById('avgLatency').textContent = `${results.statistics.avgLatency}ms`;
    document.getElementById('successCount').textContent = `${results.statistics.successfulApis}/${results.statistics.totalApis}`;
    
    // 顯示融合結果
    fusedContent.innerHTML = results.fusedResponse.content.replace(/\n/g, '<br>');
    
    // 顯示各API結果
    resultsGrid.innerHTML = '';
    Object.values(results.apiResponses).forEach(response => {
        const card = document.createElement('div');
        card.className = `result-card ${response.success ? 'success' : 'error'}`;
        
        card.innerHTML = `
            <div class="result-header">
                <div class="api-name">
                    <span>${response.apiIcon}</span>
                    <span>${response.apiName}</span>
                </div>
                <span class="api-cost">$${response.cost.toFixed(6)}</span>
            </div>
            <div class="result-content">
                ${response.success ? 
                    `<p>${response.content.substring(0, 150)}...</p>` :
                    `<p class="error-text">❌ ${response.error}</p>`
                }
            </div>
            <div class="result-meta">
                <span>⏱️ ${response.latency}ms</span>
                <span>📝 ${response.tokens} tokens</span>
                <span>${response.success ? '✅ 成功' : '❌ 失敗'}</span>
            </div>
        `;
        
        resultsGrid.appendChild(card);
    });
    
    // 保存當前結果
    appState.currentResults = results;
    
    // 滾動到結果區域
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function downloadResults() {
    if (!appState.currentResults) {
        showNotification('沒有可下載的結果', 'warning');
        return;
    }
    
    const data = {
        timestamp: new Date().toISOString(),
        prompt: document.getElementById('prompt')?.value || '',
        userPlan: appState.user.plan,
        results: appState.currentResults
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-fusion-results-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('結果已下載', 'success');
}

function shareResults() {
    if (!appState.currentResults) {
        showNotification('沒有可分享的結果', 'warning');
        return;
    }
    
    const text = `AI Fusion Pro分析結果：\n${document.getElementById('prompt')?.value?.substring(0, 100)}...\n\n查看完整結果：${window.location.href}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'AI Fusion Pro 分析結果',
            text: text,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('結果連結已複製到剪貼簿', 'success');
        });
    }
}

function clearResults() {
    const resultsSection = document.getElementById('results');
    resultsSection.style.display = 'none';
    appState.currentResults = null;
    
    // 清空輸入
    document.getElementById('prompt').value = '';
    
    showNotification('結果已清除', 'info');
}

function showKeyHelp() {
    const helpText = `
如何獲取API密鑰：

1. OpenAI GPT:
   - 訪問：platform.openai.com/api-keys
   - 註冊帳號
   - 點擊「Create new secret key」
   - 複製密鑰

2. DeepSeek (免費):
   - 訪問：platform.deepseek.com
   - 註冊帳號
   - 點擊「API Keys」
   - 創建新密鑰

3. Google Gemini:
   - 訪問：makersuite.google.com/app/apikey
   - 登入Google帳號
   - 創建API密鑰

4. Claude AI:
   - 訪問：console.anthropic.com
   - 註冊帳號
   - 獲取API密鑰

注意：請妥善保管您的API密鑰，避免分享給他人。
    `;
    
    alert(helpText);
}

function showLogin() {
    alert('登入功能將在未來版本中推出。目前所有功能都可直接使用。');
}

function startFreeTrial() {
    appState.user.plan = 'free';
    appState.user.selectedApis = ['openai', 'deepseek', 'gemini'].slice(0, 3);
    saveUserData();
    renderApiGrid();
    updatePlanDisplay();
    
    showNotification('已啟用免費試用版，可使用3個API服務', 'success');
    scrollToDemo();
}

function scrollToDemo() {
    document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
}

function updatePlanDisplay() {
    const plan = appState.user.plan;
    const planName = plan === 'free' ? '免費版' : plan === 'pro' ? '專業版' : '企業版';
    const maxApis = CONFIG.plans[plan].maxApis;
    
    // 可以在這裡更新頁面上的計劃顯示
}

function updateUsageDisplay() {
    const usage = appState.user.usage;
    const limit = usage.monthlyLimit;
    const used = usage.requests;
    const percentage = (used / limit) * 100;
    
    // 可以在這裡更新使用情況顯示
}

function showNotification(message, type = 'info') {
    // 創建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="notification-text">${message}</span>
    `;
    
    // 添加到頁面
    document.body.appendChild(notification);
    
    // 顯示動畫
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 3秒後移除
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

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
    
    // 條款同意檢查
    const agreeCheckbox = document.getElementById('agreeCheckbox');
    if (agreeCheckbox) {
        agreeCheckbox.addEventListener('change', function() {
            if (this.checked) {
                showNotification('已同意服務條款', 'success');
            }
        });
    }
}

// 添加通知樣式
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 10px;
    background: white;
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10000;
    transform: translateX(150%);
    transition: transform 0.3s ease;
    max-width: 400px;
}

.notification.show {
    transform: translateX(0);
}

.notification-success {
    border-left: 4px solid #28a745;
}

.notification-warning {
    border-left: 4px solid #ffc107;
}

.notification-error {
    border-left: 4px solid #dc3545;
}

.notification-info {
    border-left: 4px solid #17a2b8;
}

.notification-icon {
    font-size: 1.2rem;
}

.notification-text {
    flex: 1;
}
`;
document.head.appendChild(notificationStyle);
