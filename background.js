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

const DYNAMIC_GB_RATES = {};

const RESOLUTION_GB_MAP = {
  2160: 7.0,
  1440: 4.5,
  1080: 3.0,
  720: 1.5,
  480: 0.7,
  360: 0.25,
  240: 0.15,
  144: 0.1
};

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
  if (resolution && typeof resolution === 'number') {
    const keys = Object.keys(RESOLUTION_GB_MAP).map(Number).sort((a, b) => b - a);
    for (let key of keys) {
      if (resolution >= key) return RESOLUTION_GB_MAP[key];
    }
  }
  if (downlink && typeof downlink === 'number') {
    if (downlink >= 20) return CATEGORY_DEFAULT_GB.streaming * 2.0;
    if (downlink >= 5) return CATEGORY_DEFAULT_GB.streaming;
    return CATEGORY_DEFAULT_GB.streaming * 0.6;
  }
  if (avgReqMB && typeof avgReqMB === 'number') {
    if (avgReqMB >= 2) return CATEGORY_DEFAULT_GB.streaming * 2.0;
    if (avgReqMB >= 0.5) return CATEGORY_DEFAULT_GB.streaming;
  }
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

function getLocalDateString(date = new Date()) {
  const pad = (n) => (n < 10 ? '0' + n : n);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getGbPerHourForDomain(domain) {
  const dynamic = DYNAMIC_GB_RATES[domain];
  return (dynamic && dynamic.gbPerHour) || DATA_USAGE_PER_HOUR[domain] || DATA_USAGE_PER_HOUR["default"];
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

// === New: Rule-Based Suggestions Using dailyHistory ===
function checkDailyHistorySuggestions() {
  chrome.storage.local.get(['dailyHistory'], (res) => {
    const history = res.dailyHistory || [];
    if (!history.length) return;
    const today = history[history.length - 1];
    if (!today?.totals) return;

    // Rule 1: Total CO₂ > 100g
    if (today.totals.co2 > 100) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: "High CO₂ Usage",
        message: "Your CO₂ usage is high today. Try taking a short break from streaming."
      });
    }

    // Rule 2: Streaming > 2h at 1080p+
    const streamingDomain = Object.keys(today.domains).find(d => getCategoryFromDomain(d) === 'streaming');
    if (streamingDomain) {
      const streamData = today.domains[streamingDomain];
      const hours = streamData.seconds / 3600;
      if (hours > 2) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon128.png",
          title: "Streaming Suggestion",
          message: "You've streamed over 2 hours. Consider lowering resolution to save CO₂."
        });
      }
    }
  });
}

function addToDailyHistory(domain, secondsSpent, gbUsed, co2) {
  if (!domain) return;
  const dateStr = getLocalDateString();
  chrome.storage.local.get(['dailyHistory'], (res) => {
    const history = Array.isArray(res.dailyHistory) ? res.dailyHistory : [];
    let today = history.find(e => e.date === dateStr);
    if (!today) {
      today = { date: dateStr, domains: {}, totals: { seconds: 0, gb: 0, co2: 0 } };
      history.push(today);
    }
    const domainEntry = today.domains[domain] || { seconds: 0, gb: 0, co2: 0 };
    domainEntry.seconds += secondsSpent;
    domainEntry.gb += gbUsed;
    domainEntry.co2 += co2;
    today.domains[domain] = domainEntry;
    today.totals.seconds += secondsSpent;
    today.totals.gb += gbUsed;
    today.totals.co2 += co2;

    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    while (history.length > 28) history.shift();

    chrome.storage.local.set({ dailyHistory: history }, () => {
      checkDailyHistorySuggestions(); // ✅ Check rules after updating history
    });
  });
}

// === Rule-Based AI Suggestions ===
function checkRuleBasedSuggestions(domain, secondsSpent) {
  if (!domain) return;

  const hoursSpent = secondsSpent / 3600;
  if (domain.includes("youtube") && hoursSpent > 2) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Suggestion",
      message: "You've been watching YouTube for over 2 hours at high resolution. Consider lowering video quality to save CO₂."
    });
  }
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
    chrome.storage.local.set({ usage: usageData, co2: co2Data }, () => {
      const gbPerHour = getGbPerHourForDomain(domain);
      const gbUsed = gbPerHour * (secondsSpent / 3600);
      addToDailyHistory(domain, secondsSpent, gbUsed, co2);
      checkRuleBasedSuggestions(domain, usageData[domain]);
    });
  });
}

// === New Day Auto-Reset ===
function checkAndResetForNewDay() {
  const today = getLocalDateString();
  chrome.storage.local.get(["lastOpenedDate"], (res) => {
    if (res.lastOpenedDate !== today) {
      chrome.storage.local.set({
        usage: {},
        co2: {},
        lastOpenedDate: today
      });
    }
  });
}
setInterval(checkAndResetForNewDay, 60 * 1000);

// === Event Listeners ===

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return;

  if (message.type === 'VIDEO_STATS') {
    const domain = message.domain;
    const gb = calcGbPerHourFromStats({
      resolution: message.resolution,
      downlink: message.downlink,
      avgReqMB: message.avgReqMB,
      domain
    });
    DYNAMIC_GB_RATES[domain] = { gbPerHour: gb, lastUpdated: Date.now() };
    chrome.storage.local.set({ dynamicRates: DYNAMIC_GB_RATES });
  }

  if (message.type === 'GET_DAILY_HISTORY') {
    chrome.storage.local.get(['dailyHistory'], (res) => {
      sendResponse({ dailyHistory: res.dailyHistory || [] });
    });
    return true;
  }
});

// Tab switch
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

// URL change
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

// AFK detection
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

// Final save on suspend
chrome.runtime.onSuspend.addListener(() => {
  const now = Date.now();
  const timeSpent = Math.floor((now - startTimestamp) / 1000);
  if (currentDomain && timeSpent > 0) {
    saveTime(currentDomain, timeSpent);
  }
});

// ====== Stable Prediction Logic Using Real dailyHistory ======
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "predictCO2") {
    const daysAhead = request.days;
    if (daysAhead < 1 || daysAhead > 7) {
      sendResponse({ success: false, prediction: "Please enter a number between 1 and 7." });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const storageKey = `prediction_${today}_${daysAhead}`;

    chrome.storage.local.get(["dailyHistory", storageKey], (data) => {
      if (data[storageKey]) {
        sendResponse({ success: true, prediction: data[storageKey] });
        return;
      }

      const dailyHistory = data.dailyHistory || [];
      if (dailyHistory.length < 2) {
        sendResponse({ success: false, prediction: "Not enough data" });
        return;
      }

      const avgDailyCO2 = dailyHistory.reduce((sum, day) => sum + (day.totals?.co2 || 0), 0) / dailyHistory.length;
      const predictedValue = (avgDailyCO2 * daysAhead).toFixed(2);

      chrome.storage.local.set({ [storageKey]: predictedValue }, () => {
        sendResponse({ success: true, prediction: predictedValue });
      });
    });

    return true;
  }
});

console.log("Background script loaded.");
