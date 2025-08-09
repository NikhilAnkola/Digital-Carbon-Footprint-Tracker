document.addEventListener("DOMContentLoaded", () => {
  const stateSelect = document.getElementById("stateSelect");

  // Load saved state
  chrome.storage.local.get(["userState"], (res) => {
    if (res.userState) {
      stateSelect.value = res.userState;
    }
  });

  // Save state change
  stateSelect.addEventListener("change", () => {
    const selected = stateSelect.value;
    chrome.storage.local.set({ userState: selected });
  });

  // Load usage data
  loadUsageStats();
});

// Format seconds to Hh Mm
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

// CO₂ equivalent calculator
function getEquivalent(co2g) {
  const kmDriven = (co2g / 120).toFixed(2); // 120 g/km
  const phoneCharges = Math.floor(co2g / 5); // 5g per charge
  return `${kmDriven} km drive or ${phoneCharges} phone charges`;
}

// Main dashboard rendering
function loadUsageStats() {
  chrome.storage.local.get(["history"], (res) => {
    const history = res.history || {};
    const today = new Date().toISOString().split("T")[0];
    const todayData = history[today] || { usage: {}, co2: {} };

    const container = document.getElementById("usageContainer");
    const totalSpan = document.getElementById("totalCO2");
    const equivSpan = document.getElementById("co2Equivalent");
    const historyContainer = document.getElementById("historyContainer");

    // ==== Today’s Usage ====
    let html = `<h2>Today’s Usage</h2><ul>`;
    let totalCO2 = 0;

    for (let domain in todayData.usage) {
      const time = todayData.usage[domain];
      const grams = todayData.co2[domain] || 0;
      totalCO2 += grams;
      html += `<li><b>${domain}</b>: ${formatTime(time)} → ${grams.toFixed(1)} g CO₂</li>`;
    }

    html += "</ul>";
    container.innerHTML = html;
    totalSpan.textContent = totalCO2.toFixed(1);
    equivSpan.textContent = getEquivalent(totalCO2);

    // ==== Past 90 Days ====
    let histHtml = `<h2>Past 90 Days</h2>`;
    const sortedDates = Object.keys(history).sort().reverse();
    const recentDates = sortedDates.slice(0, 90);

    if (recentDates.length > 1) {
      histHtml += "<ul>";
      recentDates.forEach(date => {
        if (date === today) return;
        let dayTotalCO2 = 0;
        for (let d in history[date].co2) {
          dayTotalCO2 += history[date].co2[d];
        }
        histHtml += `<li>${date}: ${dayTotalCO2.toFixed(1)} g CO₂</li>`;
      });
      histHtml += "</ul>";
    } else {
      histHtml += "<p>No past history yet.</p>";
    }

    historyContainer.innerHTML = histHtml;

    // ==== Optional: Trigger chart rendering ====
    if (typeof renderCharts === "function") {
      renderCharts(todayData, history);
    }
  });
}

// Reset Button
document.getElementById("resetBtn").addEventListener("click", () => {
  const confirmed = confirm("Are you sure you want to reset ALL tracking data?");
  if (confirmed) {
    chrome.storage.local.remove(["usage", "co2", "history"], () => {
      alert("All data reset successfully.");
      location.reload();
    });
  }
});
