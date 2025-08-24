// gamification.js

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

function updateGamification() {
  chrome.storage.local.get(["dailyHistory", "streakCount", "ecoPointsData"], (res) => {
    const history = res.dailyHistory || [];
    const today = new Date().toISOString().split("T")[0];
    const todayEntry = history.find(h => h.date === today);

    if (!todayEntry || !todayEntry.totals) return;

    const todayCO2 = todayEntry.totals.co2 || 0;

    // --- Streak ---
    let streak = res.streakCount || 0;
    if (todayCO2 < 300) {
      streak++;
    } else {
      streak = 0;
    }

    // --- Eco Points ---
    let ecoData = res.ecoPointsData || { points: 0 };
    const todayPoints = calculatePointsFromCO2(todayCO2);
    ecoData.points += todayPoints;

    // --- Virtual Garden ---
    ecoData.counters = updateGarden(ecoData.points);

    // Save back
    chrome.storage.local.set({
      streakCount: streak,
      ecoPointsData: ecoData,
    });
  });
}

// Listen for trigger from background.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "updateGamification") {
    updateGamification();
  }
});
