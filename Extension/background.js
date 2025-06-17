// Background service worker for the phishing detection extension

const FLASK_SERVER_URL = 'http://localhost:5000';

// Track checked URLs to avoid repeated checks
let checkedUrls = new Map();

// Function to check URL with Flask backend
async function checkUrlSafety(url) {
  try {
    const response = await fetch(`${FLASK_SERVER_URL}/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking URL:', error);
    return null;
  }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Skip checking extension pages, chrome pages, and local files
    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') || 
        tab.url.startsWith('file://') ||
        tab.url.startsWith('about:')) {
      return;
    }

    // Check if we've already analyzed this URL recently
    const urlKey = new URL(tab.url).origin;
    const lastCheck = checkedUrls.get(urlKey);
    const now = Date.now();
    
    // Re-check if it's been more than 5 minutes
    if (lastCheck && (now - lastCheck.timestamp) < 300000) {
      return;
    }

    // Check URL safety
    const result = await checkUrlSafety(tab.url);
    
    if (result) {
      checkedUrls.set(urlKey, {
        timestamp: now,
        result: result
      });

      // Store result for popup access
      await chrome.storage.local.set({
        [`result_${tabId}`]: {
          url: tab.url,
          safety_score: result.safety_score,
          is_safe: result.is_safe,
          timestamp: now
        }
      });

      // Update badge based on safety
      if (!result.is_safe) {
        chrome.action.setBadgeText({
          text: '⚠',
          tabId: tabId
        });
        chrome.action.setBadgeBackgroundColor({
          color: '#ff4444',
          tabId: tabId
        });

        // Send warning to content script
        chrome.tabs.sendMessage(tabId, {
          type: 'PHISHING_WARNING',
          data: result
        }).catch(() => {
          // Ignore errors if content script is not ready
        });
      } else {
        chrome.action.setBadgeText({
          text: '✓',
          tabId: tabId
        });
        chrome.action.setBadgeBackgroundColor({
          color: '#44ff44',
          tabId: tabId
        });
      }
    }
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CHECK_CURRENT_URL') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const result = await checkUrlSafety(tabs[0].url);
        sendResponse(result);
      }
    });
    return true; // Indicates we will send a response asynchronously
  }
});

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of checkedUrls.entries()) {
    if (now - value.timestamp > 3600000) { // Remove entries older than 1 hour
      checkedUrls.delete(key);
    }
  }
}, 600000); // Run every 10 minutes