// ---------------- Helper Functions ----------------

// Points based on CO₂ for one day
function calculatePointsFromCO2(co2) {
  if (co2 > 500) return 0;
  if (co2 > 400) return 1;
  if (co2 > 300) return 2;
  if (co2 > 200) return 3;
  if (co2 > 100) return 4;
  return 5;
}

// Garden mapping based on total points
function updateGarden(points) {
  const trees = Math.floor(points / 100);
  const remainder = points % 100;

  let plant = 0;
  let seedling = 0;

  if (remainder >= 50) {
    plant = 1;
  } else if (remainder >= 20) {
    seedling = 1;
  }

  return { seedling, plant, tree: trees };
}

// Get local date string (YYYY-MM-DD)
function getLocalDateStr() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toLocaleDateString("en-CA");
}

// ---------------- Daily Gamification Update ----------------

function updateGamification() {
  chrome.storage.local.get(
    ["dailyHistory", "streakData", "ecoPointsData", "lastGamificationProcessedDate"],
    (res) => {
      const history = res.dailyHistory || [];
      if (history.length < 1) return;

      const todayStr = getLocalDateStr();
      const endedDays = history.filter(day => day.date < todayStr);
      if (endedDays.length < 1) return;

      const yesterday = endedDays[endedDays.length - 1];
      if (!yesterday || !yesterday.totals || !yesterday.date) return;

      const targetDate = yesterday.date;
      const lastProcessed = res.lastGamificationProcessedDate;

      // Process only once per day
      if (lastProcessed === targetDate) {
        console.log("Gamification already processed for", targetDate);
        return;
      }

      // Use existing streak & ecoPoints so trimming history doesn't reset totals
      let streak = res.streakData || { current: 0, max: 0 };
      let ecoData = res.ecoPointsData || { points: 0, counters: { seedling: 0, plant: 0, tree: 0 } };

      const co2 = yesterday.totals.co2 || 0;

      // --- Streak update ---
      if (co2 < 300) {
        streak.current++;
        streak.max = Math.max(streak.max, streak.current);
      } else {
        streak.current = 0;
      }

      // --- Eco Points update ---
      const points = calculatePointsFromCO2(co2);
      ecoData.points += points;
      ecoData.counters = updateGarden(ecoData.points);

      // Save
      chrome.storage.local.set({
        streakData: streak,
        ecoPointsData: ecoData,
        lastGamificationProcessedDate: targetDate
      }, () => {
        console.log("Gamification processed for", targetDate);
      });
    }
  );
}

// ---------------- Retroactive Rebuild ----------------

function rebuildGamificationData() {
  chrome.storage.local.get(["dailyHistory", "ecoPointsData", "streakData"], (res) => {
    const history = res.dailyHistory || [];
    if (history.length === 0) return;

    const todayStr = getLocalDateStr();
    const endedDays = history.filter(day => day.date < todayStr);
    if (endedDays.length === 0) {
      chrome.storage.local.set({
        streakData: { current: 0, max: 0 },
        ecoPointsData: { points: 0, counters: { seedling: 0, plant: 0, tree: 0 } },
        lastGamificationProcessedDate: null
      });
      return;
    }

    // Preserve existing totals if any
    let streak = res.streakData || { current: 0, max: 0 };
    let ecoData = res.ecoPointsData || { points: 0, counters: { seedling: 0, plant: 0, tree: 0 } };

    endedDays.forEach((entry) => {
      const co2 = entry.totals?.co2 || 0;
      const points = calculatePointsFromCO2(co2);

      ecoData.points += points;
      if (co2 < 300) {
        streak.current++;
        streak.max = Math.max(streak.max, streak.current);
      } else {
        streak.current = 0;
      }
    });

    ecoData.counters = updateGarden(ecoData.points);
    const lastEndedDate = endedDays[endedDays.length - 1].date;

    chrome.storage.local.set({
      streakData: streak,
      ecoPointsData: ecoData,
      lastGamificationProcessedDate: lastEndedDate
    }, () => {
      console.log("Gamification data rebuilt. Last processed day:", lastEndedDate);
    });
  });
}

// ---------------- Listener ----------------

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "updateGamification") {
    updateGamification();
  } else if (msg.type === "rebuildGamificationData") {
    rebuildGamificationData();
  }
});

self.updateGamification = updateGamification;
self.rebuildGamificationData = rebuildGamificationData;
