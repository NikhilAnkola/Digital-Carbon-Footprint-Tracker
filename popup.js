document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup script loaded.");

  const stateSelect = document.getElementById("stateSelect");

  // --- Auto-clear daily data if a new day started ---
  const todayStr = new Date().toISOString().split("T")[0];
  chrome.storage.local.get(["lastPopupDate"], (res) => {
    if (res.lastPopupDate !== todayStr) {
      // New day → clear usage & co2, keep history & state
      chrome.storage.local.set(
        { usage: {}, co2: {}, lastPopupDate: todayStr },
        () => {
          console.log("New day detected — cleared daily usage & CO₂.");
          // Reload after clearing so fresh UI appears
          location.reload();
        }
      );
    }
  });

  // Load and apply saved state
  chrome.storage.local.get(["userState"], (res) => {
    if (res.userState) {
      stateSelect.value = res.userState;
    }
  });

  // Save state on change
  stateSelect.addEventListener("change", () => {
    const selected = stateSelect.value;
    chrome.storage.local.set({ userState: selected });
  });

  // Date inputs for history filtering
  const startInput = document.getElementById("startDateInput");
  const endInput = document.getElementById("endDateInput");

  if (startInput && endInput) {
    startInput.addEventListener("change", loadDailyHistory);
    endInput.addEventListener("change", loadDailyHistory);
  }

  // Load and render CO2 + usage stats
  loadUsageStats();

  // Load and render 28-day daily history
  loadDailyHistory();

  // Prediction feature
  const predictBtn = document.getElementById("predictBtn");
  const predictionResult = document.getElementById("predictionResult");

  if (predictBtn) {
    predictBtn.addEventListener("click", () => {
      console.log("Predict button clicked");
      let daysAhead = parseInt(document.getElementById("daysAhead").value, 10);

      // Validation: Only allow numbers between 1 and 7
      if (isNaN(daysAhead) || daysAhead < 1 || daysAhead > 7) {
        predictionResult.textContent = "Please enter a number between 1 and 7.";
        return;
      }

      chrome.runtime.sendMessage({ action: "predictCO2", days: daysAhead }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError.message);
          predictionResult.textContent = "Error: Could not connect to background script.";
          return;
        }

        if (response && typeof response.prediction !== "undefined") {
          predictionResult.textContent = `Predicted CO₂ emissions in ${daysAhead} days: ${response.prediction} grams`;
          console.log(`Predicted CO₂ emissions in ${daysAhead} days: ${response.prediction} grams`);
        } else {
          predictionResult.textContent = "Prediction failed.";
        }
      });
    });
  } else {
    console.error("Predict button not found in popup.html");
  }

  // Reset button handler
  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const confirmed = confirm("Are you sure you want to reset all tracking data?");
      if (confirmed) {
        chrome.storage.local.set(
          { usage: {}, co2: {}, userState: "India" },
          () => {
            alert("All data reset successfully.");
            location.reload();
          }
        );
      }
    });
  }
});

// Format time from seconds to "Xh Ym"
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

// Convert grams CO2 to kg + g if needed
function formatCO2(co2g) {
  if (co2g >= 1000) {
    const kg = Math.floor(co2g / 1000);
    const g = Math.round(co2g % 1000);
    return `${kg} kg ${g} g`;
  }
  return `${co2g.toFixed(2)} g`;
}

// Convert grams CO2 to real-world equivalent
function getEquivalent(co2g) {
  const kmDriven = (co2g / 120).toFixed(2); // 120 g/km
  const phoneCharges = Math.floor(co2g / 5); // 5g per charge

  const co2Formatted =
    co2g >= 1000
      ? `${Math.floor(co2g / 1000)} kg ${Math.round(co2g % 1000)} g`
      : `${co2g.toFixed(2)} g`;

  return `${co2Formatted} = ${kmDriven} km driven or ${phoneCharges}% phone charged`;
}

function loadUsageStats() {
  chrome.storage.local.get(["usage", "co2"], (res) => {
    const usage = res.usage || {};
    const co2 = res.co2 || {};
    const container = document.getElementById("usageContainer");
    const totalSpan = document.getElementById("totalCO2");
    const equivSpan = document.getElementById("co2Equivalent");

    let html = "<ul>";
    let totalCO2 = 0;

    for (let domain in usage) {
      const time = usage[domain];
      const grams = co2[domain] || 0;
      totalCO2 += grams;
      html += `<li><b>${domain}</b>: ${formatTime(time)} → ${grams.toFixed(2)} g CO₂</li>`;
    }

    html += "</ul>";
    container.innerHTML = html;
    totalSpan.textContent = totalCO2.toFixed(2);
    equivSpan.textContent = getEquivalent(totalCO2);
  });
}

function loadDailyHistory() {
  chrome.storage.local.get(["dailyHistory"], (res) => {
    let history = res.dailyHistory || [];

    // Sort by date (newest first)
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Keep only last 28 days
    history = history.slice(0, 28);

    // Save trimmed history back so storage doesn't grow endlessly
    chrome.storage.local.set({ dailyHistory: history });

    const historyContainer = document.getElementById("historyContainer");

    if (history.length === 0) {
      historyContainer.innerHTML = "<p>No historical data available.</p>";
      return;
    }

    const startInput = document.getElementById("startDateInput");
    const endInput = document.getElementById("endDateInput");

    let startDate = startInput && startInput.value ? new Date(startInput.value) : null;
    let endDate = endInput && endInput.value ? new Date(endInput.value) : null;

    let filteredHistory = history.filter(day => {
      const dayDate = new Date(day.date);
      if (startDate && dayDate < startDate) return false;
      if (endDate && dayDate > endDate) return false;
      return true;
    });

    let html = "<table border='1' style='width:100%; border-collapse: collapse;'>";
    html += "<tr><th>Date</th><th>Total Time</th><th>Data Used (GB)</th><th>CO₂</th></tr>";

    filteredHistory.forEach(day => {
      html += `<tr>
        <td>${day.date}</td>
        <td>${formatTime(day.totals.seconds)}</td>
        <td>${day.totals.gb.toFixed(2)}</td>
        <td>${formatCO2(day.totals.co2)}</td>
      </tr>`;
    });

    html += "</table>";
    historyContainer.innerHTML = html;
  });
}
