// The panelInjected flag is no longer needed with the new logic.
// You can remove this line.

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "togglePanel") {
    togglePanel();
  }
});

function togglePanel() {
  let panel = document.getElementById("carbonPanel");

  // If the panel already exists on the page, just toggle its visibility
  if (panel) {
    panel.classList.toggle("open");
    return; // We're done, so exit the function
  }

  // If the panel doesn't exist, fetch the HTML and inject it
  fetch(chrome.runtime.getURL("panel.html"))
    .then(r => r.text())
    .then(html => {
      // Create a temporary container to hold the new HTML
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = html.trim();

      // Get the actual panel element from the container
      const panelNode = tempContainer.firstElementChild;
      
      if (panelNode) {
        // Add the panel to the page's body
        document.body.appendChild(panelNode);

        // NOW that the panel is in the DOM, we can safely initialize it
        initPanel();

        // Use a short timeout to ensure the element is painted before adding the 'open' class for a smooth transition
        setTimeout(() => {
          panelNode.classList.add("open");
        }, 50);
      }
    })
    .catch(err => console.error("Panel load failed:", err));
}

function initPanel() {
  const stateSelect = document.getElementById("stateSelect");
  const closeBtn = document.getElementById("closePanel");

  // Load saved state
  chrome.storage.local.get(["userState"], (res) => {
    if (res.userState) {
      stateSelect.value = res.userState;
    }
  });

  // Save state on change
  stateSelect.addEventListener("change", () => {
    chrome.storage.local.set({ userState: stateSelect.value });
  });

  // Close panel button
  closeBtn.addEventListener("click", () => {
    document.getElementById("carbonPanel").classList.remove("open");
  });

  // Close if clicked outside
  document.addEventListener("click", (e) => {
    const panel = document.getElementById("carbonPanel");
    if (
      panel &&
      !panel.contains(e.target) &&
      !e.target.closest("#carbonPanel") &&
      panel.classList.contains("open")
    ) {
      panel.classList.remove("open");
    }
  });

  // Load stats
  loadUsageStats();

  // Reset data
  document.getElementById("resetBtn").addEventListener("click", resetData);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function getEquivalent(co2g) {
  const kmDriven = (co2g / 120).toFixed(2);
  const phoneCharges = Math.floor(co2g / 5);
  return `${kmDriven} km drive or ${phoneCharges} phone charges`;
}

function loadUsageStats() {
  chrome.storage.local.get(["history"], (res) => {
    const history = res.history || {};
    const container = document.getElementById("usageContainer");
    const totalSpan = document.getElementById("totalCO2");
    const equivSpan = document.getElementById("co2Equivalent");
    const historyContainer = document.getElementById("historyContainer");

    const today = new Date().toISOString().split("T")[0];
    const todayData = history[today] || { usage: {}, co2: {} };

    // === Today's usage summary ===
    let html = "<div class='section-box'><h3>Today's Usage</h3><ul>";
    let totalCO2 = 0;
    let hasTodayData = false;

    for (let domain in todayData.usage) {
      const time = todayData.usage[domain];
      const grams = todayData.co2[domain] || 0;
      totalCO2 += grams;
      hasTodayData = true;
      html += `<li><b>${domain}</b>: ${formatTime(time)} → ${grams.toFixed(1)} g CO₂</li>`;
    }

    html += "</ul></div>";
    container.innerHTML = hasTodayData ? html : "<p>No usage recorded today.</p>";

    totalSpan.textContent = totalCO2.toFixed(1);
    equivSpan.textContent = getEquivalent(totalCO2);

    // === Past history ===
    let histHtml = "<div class='section-box'><h3>Past 90 Days</h3><ul>";
    const sortedDates = Object.keys(history).sort().reverse();
    const recentDates = sortedDates.slice(0, 90);
    let hasHistory = false;

    recentDates.forEach(date => {
      if (date === today) return;
      let dayTotal = 0;
      for (let d in history[date].co2) {
        dayTotal += history[date].co2[d];
      }
      if (dayTotal > 0) {
        histHtml += `<li>${date}: ${dayTotal.toFixed(1)} g CO₂</li>`;
        hasHistory = true;
      }
    });

    histHtml += "</ul></div>";
    historyContainer.innerHTML = hasHistory ? histHtml : "<p>No past history yet.</p>";
  });
}

function resetData() {
  if (confirm("Are you sure you want to reset ALL tracking data?")) {
    chrome.storage.local.remove(["usage", "co2", "history"], () => {
      alert("All data reset successfully.");
      loadUsageStats();
    });
  }
}