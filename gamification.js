// ---------------- Helper Functions ----------------

function calculatePointsFromCO2(co2) {
  if (co2 > 500) return 0;
  if (co2 > 400) return 1;
  if (co2 > 300) return 2;
  if (co2 > 200) return 3;
  if (co2 > 100) return 4;
  return 5;
}

function updateGarden(points) {
  const counters = { seedling: 0, plant: 0, tree: 0 };

  let remaining = points;
  while (remaining >= 100) {
    counters.tree++;
    remaining -= 100;
  }
  while (remaining >= 50) {
    counters.plant++;
    remaining -= 50;
  }
  while (remaining >= 20) {
    counters.seedling++;
    remaining -= 20;
  }

  return counters;
}

// ---------------- Main Daily Update ----------------

function updateGamification() {
  chrome.storage.local.get(
    ["dailyHistory", "streakData", "ecoPointsData", "lastGamificationProcessedDate"],
    (res) => {
      const history = res.dailyHistory || [];
      if (history.length < 2) return; // need yesterday + today

      const yesterdayEntry = history[history.length - 2];
      if (!yesterdayEntry || !yesterdayEntry.totals || !yesterdayEntry.date) return;

      const targetDate = yesterdayEntry.date;
      const lastProcessed = res.lastGamificationProcessedDate;

      // Already processed? skip
      if (lastProcessed === targetDate) return;

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

      chrome.storage.local.set({
        streakData: streak,
        ecoPointsData: ecoData,
        lastGamificationProcessedDate: targetDate
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

    // Exclude the most recent day (today)
    const endedDays = history.slice(0, Math.max(0, history.length - 1));

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

    const lastEndedDate =
      endedDays.length > 0 ? endedDays[endedDays.length - 1].date : null;

    chrome.storage.local.set({
      streakData: streak,
      ecoPointsData: ecoData,
      lastGamificationProcessedDate: lastEndedDate || null
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
