// === Configuration Tables ===
const DATA_USAGE_PER_HOUR = {
  "youtube.com": 1.5,
  "netflix.com": 3.0,
  "zoom.us": 1.0,
  "meet.google.com": 1.0,
  "whatsapp.com": 0.02,
  "instagram.com": 0.5,
  "facebook.com": 0.4,
  "docs.google.com": 0.05,
  "quora.com": 0.05,
  "linkedin.com": 0.1,
  "github.com": 0.05,
  "default": 0.2
};

const ELECTRICITY_PER_GB_KWH = 0.12;

const STATE_EMISSION_FACTOR = {
  "Andra Pradesh": 654,
  "Arunachal Pradesh": 24,
  "Ass am": 586,
  "Bi har": 815,
  "Chattis garh": 806,
  "Go a": 46,
  "Guja rat": 492,
  "Har yana": 769,
  "Himachal Pradesh": 24,
  "Jharkh and": 814,
  "Karna taka": 394,
  "Ker ala": 28,
  "Madhya Pradesh": 729,
  "Mahar ashtra": 658,
  "Mani pur": 24,
  "Megha laya": 24,
  "Mizo ram": 25,
  "Naga land": 24,
  "Odi sha": 739,
  "Pun jab": 685,
  "Rajas than": 437,
  "Sikk im": 24,
  "Tamil Nadu": 493,
  "Telan gana": 679,
  "Tri pura": 489,
  "Uttar Pradesh": 764,
  "Uttara khand": 57,
  "West Bengal": 782
};

// === Runtime Variables ===
let currentTabId = null;
let currentDomain = null;
let startTimestamp = Date.now();

// === Helpers ===
function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function estimateCO2(domain, seconds, userState) {
  const hours = seconds / 3600;
  const gbPerHour = DATA_USAGE_PER_HOUR[domain] || DATA_USAGE_PER_HOUR["default"];
  const gbUsed = gbPerHour * hours;
  const electricityUsed = gbUsed * ELECTRICITY_PER_GB_KWH;
  const emissionFactor = STATE_EMISSION_FACTOR[userState];
  return electricityUsed * emissionFactor;
}

function saveTime(domain, secondsSpent) {
  if (!domain || !secondsSpent) return;

  chrome.storage.local.get(["usage", "co2", "userState", "history"], function (result) {
    const usageData = result.usage || {};
    const co2Data = result.co2 || {};
    const userState = result.userState;
    const history = result.history || {};

    if (!userState || !(userState in STATE_EMISSION_FACTOR)) return;

    const co2 = estimateCO2(domain, secondsSpent, userState);

    // Update totals
    usageData[domain] = (usageData[domain] || 0) + secondsSpent;
    co2Data[domain] = (co2Data[domain] || 0) + co2;

    // === Daily History Tracking ===
    const today = new Date().toISOString().split("T")[0];
    if (!history[today]) {
      history[today] = { usage: {}, co2: {} };
    }
    history[today].usage[domain] = (history[today].usage[domain] || 0) + secondsSpent;
    history[today].co2[domain] = (history[today].co2[domain] || 0) + co2;

    // Keep only last 90 days
    const allDates = Object.keys(history).sort();
    while (allDates.length > 90) {
      delete history[allDates[0]];
      allDates.shift();
    }

    chrome.storage.local.set({ usage: usageData, co2: co2Data, history: history });
  });
}

// === Track Tab Switch ===
chrome.tabs.onActivated.addListener(function (info) {
  chrome.tabs.get(info.tabId, function (tab) {
    if (!tab.url) return;
    const domain = getDomainFromUrl(tab.url);
    const now = Date.now();

    if (currentDomain && startTimestamp) {
      const timeSpent = Math.floor((now - startTimestamp) / 1000);
      saveTime(currentDomain, timeSpent);
    }

    currentTabId = info.tabId;
    currentDomain = domain;
    startTimestamp = now;
  });
});

// === Track URL Change in Same Tab ===
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (tab.active && changeInfo.url) {
    const domain = getDomainFromUrl(changeInfo.url);
    const now = Date.now();

    if (currentDomain && startTimestamp) {
      const timeSpent = Math.floor((now - startTimestamp) / 1000);
      saveTime(currentDomain, timeSpent);
    }

    currentTabId = tabId;
    currentDomain = domain;
    startTimestamp = now;
  }
});

// === AFK-Friendly Polling (1s) ===
setInterval(() => {
  chrome.windows.getLastFocused({ populate: true }, (window) => {
    if (!window || !window.focused || !window.tabs) return;
    const activeTab = window.tabs.find(t => t.active);
    if (!activeTab || !activeTab.url) return;

    const domain = getDomainFromUrl(activeTab.url);
    const now = Date.now();

    if (domain === currentDomain && startTimestamp) {
      const timeSpent = Math.floor((now - startTimestamp) / 1000);
      saveTime(domain, timeSpent);
      startTimestamp = now;
    } else {
      currentDomain = domain;
      startTimestamp = now;
    }
  });
}, 1000);

// === Save on Extension Suspend ===
chrome.runtime.onSuspend.addListener(() => {
  const now = Date.now();
  const timeSpent = Math.floor((now - startTimestamp) / 1000);
  if (currentDomain && timeSpent > 0) {
    saveTime(currentDomain, timeSpent);
  }
});

// === Toggle Floating Panel Instead of Opening New Tab ===
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { action: "togglePanel" });
});
