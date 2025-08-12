document.addEventListener("DOMContentLoaded", () => {
  const stateSelect = document.getElementById("stateSelect");

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

  // Load and render CO2 + usage stats
  loadUsageStats();
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
  return `${co2g.toFixed(1)} g`;
}

// Convert grams CO2 to real-world equivalent
function getEquivalent(co2g) {
  const kmDriven = (co2g / 120).toFixed(2); // 120 g/km
  const phoneCharges = Math.floor(co2g / 5); // 5g per charge

  const co2Formatted =
    co2g >= 1000
      ? `${Math.floor(co2g / 1000)} kg ${Math.round(co2g % 1000)} g`
      : `${co2g.toFixed(1)} g`;

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
      html += `<li><b>${domain}</b>: ${formatTime(time)} → ${grams.toFixed(1)} g CO₂</li>`;
    }

    html += "</ul>";
    container.innerHTML = html;
    totalSpan.textContent = totalCO2.toFixed(1);
    equivSpan.textContent = getEquivalent(totalCO2);
  });
}

document.getElementById("resetBtn").addEventListener("click", () => {
  const confirmed = confirm("Are you sure you want to reset all tracking data?");
  if (confirmed) {
    chrome.storage.local.set(
      { usage: {}, co2: {}, userState: "India" }, // Reset usage, co2, and state
      () => {
        alert("All data reset successfully.");
        location.reload(); // Refresh popup UI
      }
    );
  }
});