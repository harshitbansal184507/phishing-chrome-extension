// Popup script for the phishing detection extension

document.addEventListener('DOMContentLoaded', function() {
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const statusCard = document.getElementById('status-card');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    const statusDetails = document.getElementById('status-details');
    const urlDisplay = document.getElementById('url-display');
    const refreshBtn = document.getElementById('refresh-btn');
    const reportBtn = document.getElementById('report-btn');
    const retryBtn = document.getElementById('retry-btn');

    // Check current tab's safety status
    async function checkCurrentTab() {
        try {
            showLoading();
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error('Unable to access current tab');
            }

            // Skip checking for chrome:// and extension pages
            if (tab.url.startsWith('chrome://') || 
                tab.url.startsWith('chrome-extension://') || 
                tab.url.startsWith('file://') ||
                tab.url.startsWith('about:')) {
                showResult({
                    url: tab.url,
                    is_safe: true,
                    safety_score: 1.0,
                    message: 'Browser pages are considered safe'
                });
                return;
            }

            // First check if we have cached result
            const cachedResult = await chrome.storage.local.get([`result_${tab.id}`]);
            const cached = cachedResult[`result_${tab.id}`];
            
            if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 minutes cache
                showResult(cached);
                return;
            }

            // Make fresh request to background script
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'CHECK_CURRENT_URL' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            if (response) {
                response.url = tab.url;
                showResult(response);
            } else {
                throw new Error('No response from background script');
            }

        } catch (error) {
            console.error('Error checking tab:', error);
            showError();
        }
    }

    function showLoading() {
        loadingDiv.style.display = 'block';
        resultDiv.style.display = 'none';
        errorDiv.style.display = 'none';
    }

    function showResult(data) {
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'none';
        resultDiv.style.display = 'block';

        const safetyPercentage = (data.safety_score * 100).toFixed(1);
        const isVeryUnsafe = data.safety_score < 0.3;
        const isUnsafe = data.safety_score < 0.6;
        
        // Update status card styling
        statusCard.className = 'status-card ' + (data.is_safe ? 'safe' : 'unsafe');
        
        // Update icon and text based on safety level
        if (data.is_safe) {
            statusIcon.textContent = '✅';
            statusText.textContent = 'Website is Safe';
            statusDetails.innerHTML = `
                <strong>${safetyPercentage}% Safe</strong><br>
                This website appears to be legitimate and secure.
            `;
        } else if (isVeryUnsafe) {
            statusIcon.textContent = '🚨';
            statusText.textContent = 'High Risk Detected';
            statusDetails.innerHTML = `
                <strong>${safetyPercentage}% Risk Level</strong><br>
                <span style="color: #ffcccb;">This website shows strong signs of being a phishing site. Exercise extreme caution!</span>
            `;
        } else if (isUnsafe) {
            statusIcon.textContent = '⚠️';
            statusText.textContent = 'Potentially Unsafe';
            statusDetails.innerHTML = `
                <strong>${safetyPercentage}% Risk Level</strong><br>
                This website may be unsafe. Proceed with caution.
            `;
        } else {
            statusIcon.textContent = '🔍';
            statusText.textContent = 'Suspicious Activity';
            statusDetails.innerHTML = `
                <strong>${safetyPercentage}% Risk Level</strong><br>
                Some suspicious patterns detected. Be careful with personal information.
            `;
        }

        // Display URL
        try {
            const url = new URL(data.url);
            urlDisplay.textContent = url.hostname;
        } catch (e) {
            urlDisplay.textContent = data.url;
        }
    }

    function showError() {
        loadingDiv.style.display = 'none';
        resultDiv.style.display = 'none';
        errorDiv.style.display = 'block';
    }

    // Event listeners
    refreshBtn.addEventListener('click', () => {
        checkCurrentTab();
    });

    reportBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            // Open a new tab with a report form or feedback page
            chrome.tabs.create({
                url: `mailto:security@yourcompany.com?subject=Phishing Report&body=I want to report this website: ${encodeURIComponent(tab.url)}`
            });
        }
    });

    retryBtn.addEventListener('click', () => {
        checkCurrentTab();
    });

    // Initial check
    checkCurrentTab();
});