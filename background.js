// background.js - Updated with CO2 Emission Estimation

// === Configuration Tables ===

// Average GB consumed per hour of usage per platform
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

// India average electricity consumption per GB of data (in kWh)
const ELECTRICITY_PER_GB_KWH = 0.12;

// Emission factor per state (gCO2 per kWh)
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
  "default": 621 // India national average
};

// === User-selected state (this will eventually come from UI/localStorage) ===
let userState = "default";

// === CO2 Estimation Function ===
function estimateCO2(domain, seconds) {
  const hours = seconds / 3600;
  const gbPerHour = DATA_USAGE_PER_HOUR[domain] || DATA_USAGE_PER_HOUR["default"];
  const gbUsed = gbPerHour * hours;
  const electricityUsed = gbUsed * ELECTRICITY_PER_GB_KWH;
  const emissionFactor = STATE_EMISSION_FACTOR[userState] || STATE_EMISSION_FACTOR["default"];
  const co2Emitted = electricityUsed * emissionFactor; // in grams
  return co2Emitted;
}

// === Runtime Tracking Variables ===
let currentTabId = null;
let currentDomain = null;
let startTimestamp = null;

// Extract domain name from full URL
function getDomainFromUrl(url) {
  try {
    let urlObject = new URL(url);
    let domain = urlObject.hostname.replace(/^www\./, "");
    return domain;
  } catch (error) {
    return null;
  }
}

// Save time spent + CO2 emissions per domain
function saveTime(domain, secondsSpent) {
  if (!domain || !secondsSpent) return;

  const co2 = estimateCO2(domain, secondsSpent);

  chrome.storage.local.get(["usage", "co2"], function(result) {
    let usageData = result.usage || {};
    let co2Data = result.co2 || {};

    usageData[domain] = (usageData[domain] || 0) + secondsSpent;
    co2Data[domain] = (co2Data[domain] || 0) + co2;

    chrome.storage.local.set({ usage: usageData, co2: co2Data });
  });
}

// Track tab switches
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

// Track URL changes in the same tab
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
