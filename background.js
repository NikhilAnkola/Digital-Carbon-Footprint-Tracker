// Variables to store current tracking info
let currentTabId = null;
let currentDomain = null;
let startTimestamp = null;

// Function to extract domain like "youtube.com" from a full URL
function getDomainFromUrl(url) {
  try {
    let urlObject = new URL(url);
    let domain = urlObject.hostname;
    if (domain.startsWith("www.")) {
      domain = domain.slice(4);
    }
    return domain;
  } catch (error) {
    return null;
  }
}

// Function to save time spent on a website
function saveTime(domain, secondsSpent) {
  if (!domain || !secondsSpent) {
    return;
  }

  chrome.storage.local.get(["usage"], function(result) {
    let usageData = result.usage || {};

    if (!usageData[domain]) {
      usageData[domain] = 0;
    }

    usageData[domain] += secondsSpent;

    chrome.storage.local.set({ usage: usageData });
  });
}

// Tracking for tab switches
chrome.tabs.onActivated.addListener(function(info) {
  chrome.tabs.get(info.tabId, function(tab) {
    if (!tab.url) return;

    let domain = getDomainFromUrl(tab.url);
    let now = Date.now();

    if (currentDomain !== null && startTimestamp !== null) {
      let timeSpent = Math.floor((now - startTimestamp) / 1000);
      saveTime(currentDomain, timeSpent);
    }

    currentTabId = info.tabId;
    currentDomain = domain;
    startTimestamp = now;
  });
});

// Tracking for URL changes in the same tab
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (tab.active && changeInfo.url) {
    let domain = getDomainFromUrl(changeInfo.url);
    let now = Date.now();

    if (currentDomain !== null && startTimestamp !== null) {
      let timeSpent = Math.floor((now - startTimestamp) / 1000);
      saveTime(currentDomain, timeSpent);
    }

    currentTabId = tabId;
    currentDomain = domain;
    startTimestamp = now;
  }
});
