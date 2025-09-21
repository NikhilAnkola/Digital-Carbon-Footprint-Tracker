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

      const todayStr = getLocalDateStr();

      // Only include fully completed days (exclude today)
      const endedDays = history.filter(day => day.date < todayStr);
      if (endedDays.length < 1) return;

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

      // --- Load existing streak & eco points ---
      let streak = res.streakData || { current: 0, max: 0 };
      let ecoData = res.ecoPointsData || {
        points: 0,
        counters: { seedling: 0, plant: 0, tree: 0 }
      };

      // --- Streak (incremental, independent of history length) ---
      if (yesterdayCO2 < 300) {
        streak.current++;
        streak.max = Math.max(streak.max, streak.current);
      } else {
        streak.current = 0;
      }

      // --- Eco Points (cumulative, independent of history length) ---
      const yesterdayPoints = calculatePointsFromCO2(yesterdayCO2);
      ecoData.points += yesterdayPoints;
      ecoData.counters = updateGarden(ecoData.points);

      // Save results
      chrome.storage.local.set({
        streakData: streak,
        ecoPointsData: ecoData,
        lastGamificationProcessedDate: targetDate
      }, () => {
        console.log("Gamification processed for", targetDate, 
          " | +", yesterdayPoints, "points | streak:", streak.current);
      });
    }
  );
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