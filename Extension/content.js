// Content script for phishing detection warnings

// Create warning banner
function createWarningBanner(data) {
  // Remove existing banner if present
  const existingBanner = document.getElementById('phishing-guard-banner');
  if (existingBanner) {
    existingBanner.remove();
  }

  const banner = document.createElement('div');
  banner.id = 'phishing-guard-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #ff4444, #cc0000);
    color: white;
    padding: 15px 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 16px;
    font-weight: 600;
    text-align: center;
    z-index: 999999;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    border-bottom: 3px solid #990000;
    animation: slideDown 0.5s ease-out;
  `;

  const safetyPercentage = (data.safety_score * 100).toFixed(1);
  
  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
      <div style="font-size: 24px;">⚠️</div>
      <div>
        <div style="font-size: 18px; margin-bottom: 5px;">
          <strong>PHISHING WARNING</strong>
        </div>
        <div style="font-size: 14px; opacity: 0.9;">
          This website appears to be unsafe (${safetyPercentage}% risk detected)
        </div>
      </div>
      <button id="dismiss-warning" style="
        background: rgba(255,255,255,0.2);
        border: 2px solid rgba(255,255,255,0.3);
        color: white;
        padding: 8px 16px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        margin-left: 20px;
      ">
        Dismiss
      </button>
    </div>
  `;

  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    #phishing-guard-banner button:hover {
      background: rgba(255,255,255,0.3) !important;
      border-color: rgba(255,255,255,0.5) !important;
    }
  `;
  document.head.appendChild(style);

  // Add to page
  document.body.insertBefore(banner, document.body.firstChild);

  // Adjust body padding to prevent content overlap
  document.body.style.paddingTop = (document.body.style.paddingTop || '0px').replace(/\d+/, 
    (match) => (parseInt(match) + 80).toString());

  // Add dismiss functionality
  document.getElementById('dismiss-warning').addEventListener('click', () => {
    banner.style.animation = 'slideDown 0.3s ease-in reverse';
    setTimeout(() => {
      banner.remove();
      // Reset body padding
      document.body.style.paddingTop = (document.body.style.paddingTop || '80px').replace(/\d+/, 
        (match) => Math.max(0, parseInt(match) - 80).toString());
    }, 300);
  });

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (document.getElementById('phishing-guard-banner')) {
      document.getElementById('dismiss-warning').click();
    }
  }, 10000);
}

// Create safety indicator
function createSafetyIndicator(data) {
  const indicator = document.createElement('div');
  indicator.id = 'phishing-guard-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${data.is_safe ? '#28a745' : '#dc3545'};
    color: white;
    padding: 10px 15px;
    border-radius: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    z-index: 999998;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    cursor: pointer;
    transition: all 0.3s ease;
  `;

  const safetyPercentage = (data.safety_score * 100).toFixed(1);
  indicator.innerHTML = `
    ${data.is_safe ? '🛡️' : '⚠️'} ${safetyPercentage}% ${data.is_safe ? 'Safe' : 'Risk'}
  `;

  indicator.addEventListener('mouseenter', () => {
    indicator.style.transform = 'scale(1.05)';
  });

  indicator.addEventListener('mouseleave', () => {
    indicator.style.transform = 'scale(1)';
  });

  document.body.appendChild(indicator);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (document.getElementById('phishing-guard-indicator')) {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }
  }, 5000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PHISHING_WARNING') {
    const data = request.data;
    
    if (!data.is_safe) {
      createWarningBanner(data);
    }
    
    createSafetyIndicator(data);
  }
});

// Check if page is already loaded
if (document.readyState === 'complete') {
  // Page is already loaded, request check
  chrome.runtime.sendMessage({ type: 'CHECK_CURRENT_URL' }, (response) => {
    if (response && !response.is_safe) {
      createWarningBanner(response);
    }
    if (response) {
      createSafetyIndicator(response);
    }
  });
}