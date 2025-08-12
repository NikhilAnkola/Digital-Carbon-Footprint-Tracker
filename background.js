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

// === New Dynamic Streaming Data ===

// runtime dynamic map: domain -> { gbPerHour, lastUpdated }
const DYNAMIC_GB_RATES = {};

// resolution (video height) -> estimated GB/hour mapping
const RESOLUTION_GB_MAP = {
  2160: 7.0,   // 4K
  1440: 4.5,   // 2K
  1080: 3.0,   // 1080p
  720: 1.5,    // 720p
  480: 0.7,
  360: 0.25,
  240: 0.15,
  144: 0.1
};

// fallback per-category default gb/hour
const CATEGORY_DEFAULT_GB = {
  streaming: 1.5,
  social: 0.5,
  messaging: 0.02,
  docs: 0.05,
  code: 0.05,
  default: 0.2
};

function getCategoryFromDomain(domain) {
  if (!domain) return 'default';
  domain = domain.toLowerCase();
  if (domain.includes('youtube') || domain.includes('netflix') || domain.includes('primevideo') || domain.includes('twitch') || domain.includes('hotstar')) return 'streaming';
  if (domain.includes('instagram') || domain.includes('facebook') || domain.includes('twitter') || domain.includes('tiktok')) return 'social';
  if (domain.includes('whatsapp') || domain.includes('telegram') || domain.includes('messenger')) return 'messaging';
  if (domain.includes('docs.google') || domain.includes('office') || domain.includes('slack')) return 'docs';
  if (domain.includes('github') || domain.includes('gitlab')) return 'code';
  return 'default';
}

function calcGbPerHourFromStats({ resolution, downlink, avgReqMB, domain }) {
  // 1) Map resolution to GB/hour if available
  if (resolution && typeof resolution === 'number') {
    const keys = Object.keys(RESOLUTION_GB_MAP).map(Number).sort((a, b) => b - a);
    for (let key of keys) {
      if (resolution >= key) return RESOLUTION_GB_MAP[key];
    }
  }

  // 2) Use downlink heuristic
  if (downlink && typeof downlink === 'number') {
    if (downlink >= 20) return CATEGORY_DEFAULT_GB.streaming * 2.0;
    if (downlink >= 5) return CATEGORY_DEFAULT_GB.streaming;
    return CATEGORY_DEFAULT_GB.streaming * 0.6;
  }

  // 3) Use average request size as hint
  if (avgReqMB && typeof avgReqMB === 'number') {
    if (avgReqMB >= 2) return CATEGORY_DEFAULT_GB.streaming * 2.0;
    if (avgReqMB >= 0.5) return CATEGORY_DEFAULT_GB.streaming;
  }

  // 4) Fallback to category default
  const cat = getCategoryFromDomain(domain);
  return CATEGORY_DEFAULT_GB[cat] || CATEGORY_DEFAULT_GB.default;
}

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
  const dynamic = DYNAMIC_GB_RATES[domain];
  const gbPerHour = (dynamic && dynamic.gbPerHour) || DATA_USAGE_PER_HOUR[domain] || DATA_USAGE_PER_HOUR["default"];
  const gbUsed = gbPerHour * hours;
  const electricityUsed = gbUsed * ELECTRICITY_PER_GB_KWH;
  const emissionFactor = STATE_EMISSION_FACTOR[userState];
  return electricityUsed * emissionFactor;
}

function saveTime(domain, secondsSpent) {
  if (!domain || !secondsSpent) return;

  chrome.storage.local.get(["usage", "co2", "userState"], function (result) {
    const usageData = result.usage || {};
    const co2Data = result.co2 || {};
    const userState = result.userState;

    if (!userState || !(userState in STATE_EMISSION_FACTOR)) return;

    const co2 = estimateCO2(domain, secondsSpent, userState);

    usageData[domain] = (usageData[domain] || 0) + secondsSpent;
    co2Data[domain] = (co2Data[domain] || 0) + co2;

    chrome.storage.local.set({ usage: usageData, co2: co2Data });
  });
}

// === Listen for dynamic stats from content scripts ===
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'VIDEO_STATS') return;
  const domain = message.domain;
  const gb = calcGbPerHourFromStats({
    resolution: message.resolution,
    downlink: message.downlink,
    avgReqMB: message.avgReqMB,
    domain
  });

  DYNAMIC_GB_RATES[domain] = { gbPerHour: gb, lastUpdated: Date.now() };
  chrome.storage.local.set({ dynamicRates: DYNAMIC_GB_RATES }, () => { });
});

// === Tab Switch ===

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

// === URL Change in Same Tab ===

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

// === AFK Support (1s interval) ===

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
}, 1000); // every 1 second

// === Final Save on Suspend ===

chrome.runtime.onSuspend.addListener(() => {
  const now = Date.now();
  const timeSpent = Math.floor((now - startTimestamp) / 1000);
  if (currentDomain && timeSpent > 0) {
    saveTime(currentDomain, timeSpent);
  }
});
