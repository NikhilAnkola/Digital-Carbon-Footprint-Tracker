let panelInjected = false;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "togglePanel") {
    togglePanel();
  }
});

function togglePanel() {
  let panel = document.getElementById("carbonPanel");
  if (!panelInjected) {
    fetch(chrome.runtime.getURL("panel.html"))
      .then(r => r.text())
      .then(html => {
        let temp = document.createElement("div");
        temp.innerHTML = html;
        document.body.appendChild(temp.firstElementChild);
        panelInjected = true;
        initPanel();
        setTimeout(() => {
          document.getElementById("carbonPanel").classList.add("open");
        }, 50);
      });
  } else {
    panel.classList.toggle("open");
  }
}

function initPanel() {
  const stateSelect = document.getElementById("stateSelect");
  const closeBtn = document.getElementById("closePanel");

  chrome.storage.local.get(["userState"], (res) => {
    if (res.userState) {
      stateSelect.value = res.userState;
    }
  });

  stateSelect.addEventListener("change", () => {
    chrome.storage.local.set({ userState: stateSelect.value });
  });

  closeBtn.addEventListener("click", () => {
    document.getElementById("carbonPanel").classList.remove("open");
  });

  loadUsageStats();
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

    let html = "<ul>";
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

    let histHtml = "<ul>";
    const sortedDates = Object.keys(history).sort().reverse();
    const recentDates = sortedDates.slice(0, 90);
    recentDates.forEach(date => {
      if (date === today) return;
      let dayTotal = 0;
      for (let d in history[date].co2) {
        dayTotal += history[date].co2[d];
      }
      histHtml += `<li>${date}: ${dayTotal.toFixed(1)} g CO₂</li>`;
    });
    histHtml += "</ul>";
    historyContainer.innerHTML = histHtml;
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
