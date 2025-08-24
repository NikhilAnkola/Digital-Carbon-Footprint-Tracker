// gamification.js
export function updateGamification(totalCO2, todayKey) {
  chrome.storage.local.get(
    ["streakData", "ecoPointsData", "gardenData"],
    (data) => {
      let { streakData, ecoPointsData, gardenData } = data;

      // init defaults
      if (!streakData) streakData = { streak: 0, lastDay: null };
      if (!ecoPointsData) ecoPointsData = { points: 0 };
      if (!gardenData) gardenData = { stage: "seedling", counters: { seedling: 0, plant: 0, tree: 0 } };

      // --- 1. Daily streak ---
      if (streakData.lastDay !== todayKey) {
        if (totalCO2 < 300) {
          streakData.streak += 1;
        } else {
          streakData.streak = 0;
        }
        streakData.lastDay = todayKey;
      }

      // --- 2. Eco points allocation ---
      let earned = 0;
      if (totalCO2 < 100) earned = 5;
      else if (totalCO2 < 200) earned = 4;
      else if (totalCO2 < 300) earned = 3;
      else if (totalCO2 < 400) earned = 2;
      else if (totalCO2 < 500) earned = 1;
      else earned = 0;

      ecoPointsData.points += earned;

      // --- 3. Garden stage update ---
      let counters = { seedling: 0, plant: 0, tree: 0 };
      let total = ecoPointsData.points;

      counters.tree = Math.floor(total / 100);
      total %= 100;
      counters.plant = Math.floor(total / 50);
      total %= 50;
      counters.seedling = Math.floor(total / 20);

      gardenData.counters = counters;

      chrome.storage.local.set({
        streakData,
        ecoPointsData,
        gardenData,
      });
    }
  );
}
