// ---------------- Helper Functions ----------------

function calculatePointsFromCO2(co2) {
  if (co2 > 500) return 0;
  if (co2 > 400) return 1;
  if (co2 > 300) return 2;
  if (co2 > 200) return 3;
  if (co2 > 100) return 4;
  return 5;
}

// Exclusive-tier garden mapping (per your spec)
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

// ---------------- Helper: Get local YYYY-MM-DD ----------------
function getLocalDateStr() {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Midnight in local time
  return now.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

// ---------------- Daily Gamification Update ----------------
function updateGamification() {
  chrome.storage.local.get(
    ["dailyHistory", "streakData", "ecoPointsData", "lastGamificationProcessedDate"],
    (res) => {
      const history = res.dailyHistory || [];
      if (history.length < 1) return; // No history

      // Get today's date in local time
      const todayStr = getLocalDateStr();

      // Only include fully completed days (exclude today)
      const endedDays = history.filter(day => day.date < todayStr);
      if (endedDays.length < 1) return; // No completed day yet

      // Last fully completed day = yesterday
      const yesterdayEntry = endedDays[endedDays.length - 1];
      if (!yesterdayEntry || !yesterdayEntry.totals || !yesterdayEntry.date) return;

      const targetDate = yesterdayEntry.date;
      const lastProcessed = res.lastGamificationProcessedDate;

      // Skip if already processed
      if (lastProcessed === targetDate) {
        console.log("Gamification already processed for", targetDate);
        return;
      }

      const yesterdayCO2 = yesterdayEntry.totals.co2 || 0;

      // --- Streak ---
      let streak = res.streakData || { current: 0, max: 0 };
      if (yesterdayCO2 < 300) {
        streak.current++;
        streak.max = Math.max(streak.max, streak.current);
      } else {
        streak.current = 0;
      }

      // --- Eco Points ---
      let ecoData = res.ecoPointsData || {
        points: 0,
        counters: { seedling: 0, plant: 0, tree: 0 }
      };

      const yesterdayPoints = calculatePointsFromCO2(yesterdayCO2);
      ecoData.points += yesterdayPoints;
      ecoData.counters = updateGarden(ecoData.points);

      // Save results
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
  chrome.storage.local.get(["dailyHistory"], (res) => {
    const history = res.dailyHistory || [];
    if (history.length === 0) return;

    let streak = { current: 0, max: 0 };
    let ecoData = { points: 0, counters: { seedling: 0, plant: 0, tree: 0 } };

    // Get today's date in local time
    const todayStr = getLocalDateStr();

    // Include only fully completed days (exclude today)
    const endedDays = history.filter(day => day.date < todayStr);
    if (endedDays.length === 0) {
      // No completed days, reset everything
      chrome.storage.local.set({
        streakData: streak,
        ecoPointsData: ecoData,
        lastGamificationProcessedDate: null
      });
      return;
    }

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

    // Last fully completed day
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