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
  "Assam": 586,
  "Bihar": 815,
  "Chattisgarh": 806,
  "Goa": 46,
  "Gujarat": 492,
  "Haryana": 769,
  "Himachal Pradesh": 24,
  "Jharkhand": 814,
  "Karnataka": 394,
  "Kerala": 28,
  "Madhya Pradesh": 729,
  "Maharashtra": 658,
  "Manipur": 24,
  "Meghalaya": 24,
  "Mizoram": 25,
  "Nagaland": 24,
  "Odisha": 739,
  "Punjab": 685,
  "Rajasthan": 437,
  "Sikkim": 24,
  "Tamil Nadu": 493,
  "Telangana": 679,
  "Tripura": 489,
  "Uttar Pradesh": 764,
  "Uttarakhand": 57,
  "West Bengal": 782,
  "default": 621
};

// === Runtime Variables ===

let currentTabId = null;
let currentDomain = null;
let startTimestamp = Date.now();

// === Helpers ===

function getDomainFromUrl(url) {
  try {
    let domain = new URL(url).hostname.replace(/^www\./, "");
    return domain;
  } catch {
    return null;
  }
}

function estimateCO2(domain, seconds, userState) {
  const hours = seconds / 3600;
  const gbPerHour = DATA_USAGE_PER_HOUR[domain] || DATA_USAGE_PER_HOUR["default"];
  const gbUsed = gbPerHour * hours;
  const electricityUsed = gbUsed * ELECTRICITY_PER_GB_KWH;
  const emissionFactor = STATE_EMISSION_FACTOR[userState] || STATE_EMISSION_FACTOR["default"];
  return electricityUsed * emissionFactor;
}

function saveTime(domain, secondsSpent) {
  if (!domain || !secondsSpent) return;

  chrome.storage.local.get(["usage", "co2", "userState"], function (result) {
    const usageData = result.usage || {};
    const co2Data = result.co2 || {};
    const userState = result.userState || "default";

    const co2 = estimateCO2(domain, secondsSpent, userState);

    usageData[domain] = (usageData[domain] || 0) + secondsSpent;
    co2Data[domain] = (co2Data[domain] || 0) + co2;

    chrome.storage.local.set({ usage: usageData, co2: co2Data });
  });
}

// === Track Tab Switches ===

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

// === Track URL Changes in Same Tab ===

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

// === AFK-Friendly Polling Every 30s ===

setInterval(() => {
  chrome.windows.getLastFocused({ populate: true }, (window) => {
    if (!window || !window.focused || !window.tabs) return;

    const activeTab = window.tabs.find(t => t.active);
    if (!activeTab || !activeTab.url) return;

    const domain = getDomainFromUrl(activeTab.url);
    const now = Date.now();

    if (domain && domain === currentDomain && startTimestamp) {
      const timeSpent = Math.floor((now - startTimestamp) / 1000);
      saveTime(domain, timeSpent);
      startTimestamp = now;
    } else {
      currentDomain = domain;
      startTimestamp = now;
    }
  });
}, 30000); // every 30 seconds
