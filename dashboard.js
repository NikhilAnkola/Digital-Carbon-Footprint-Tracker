(function () {
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function getLocalDateString(date = new Date()) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  function hmsFromSeconds(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}:${pad(m)}`;
  }

  const el = (id) => document.getElementById(id);

  async function readStorage(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function findToday(history) {
    const todayStr = getLocalDateString();
    return history.find(d => d.date === todayStr) || null;
  }

  function sumTotalCO2(history) {
    return history.reduce((acc, d) => acc + (d?.totals?.co2 || 0), 0);
  }

  function renderTable(history) {
    const tbody = el("history-table-body");
    tbody.innerHTML = "";
    const last7 = history.slice(-7).reverse(); // latest first
    last7.forEach((d) => {
      const tr = document.createElement("tr");
      const tsec = Math.round(d?.totals?.seconds || 0);
      const tgb = (d?.totals?.gb || 0);
      const tco2 = Math.round(d?.totals?.co2 || 0);
      tr.innerHTML = `
        <td class="mono">${d.date || "—"}</td>
        <td class="mono">${hmsFromSeconds(tsec)}</td>
        <td class="mono">${tgb.toFixed(2)}</td>
        <td class="mono">${tco2}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderEquivalents(todayCO2g) {
    // Very simple equivalences; you can refine later.
    // Car: ~120 gCO₂ per km (small petrol car)
    const km = todayCO2g / 120;
    // HD streaming "saved" minutes if you reduced quality:
    // Arbitrary: assume saving ~100 gCO2 per 30 min by dropping 1080p->480p depending on grid; display as ballpark
    const minutesSaved = Math.max(0, Math.round(todayCO2g / (100 / 30)));

    el("equiv-km").textContent = `${km.toFixed(1)} km driven`;
    el("equiv-min").textContent = `${minutesSaved} min of HD streaming saved`;
  }

  async function render() {
    const { dailyHistory = [], usage = {}, co2 = {}, lastOpenedDate } = await readStorage([
      "dailyHistory",
      "usage",
      "co2",
      "lastOpenedDate"
    ]);

    const today = findToday(dailyHistory) || { totals: { seconds: 0, gb: 0, co2: 0 } };

    // Summary cards
    const tsec = Math.round(today.totals.seconds || 0);
    const tgb = today.totals.gb || 0;
    const tco2 = Math.round(today.totals.co2 || 0);

    el("today-seconds").textContent = hmsFromSeconds(tsec);
    el("today-gb").textContent = `${tgb.toFixed(2)} GB`;
    el("today-co2").textContent = `${tco2} g`;

    const totalCO2 = Math.round(sumTotalCO2(dailyHistory));
    el("total-co2").textContent = `${totalCO2} g`;

    renderEquivalents(tco2);
    renderTable(dailyHistory);
  }

  // Auto-refresh when background updates storage (usage/co2/dailyHistory/lastOpenedDate)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const keys = Object.keys(changes);
    if (keys.some(k => ["usage", "co2", "dailyHistory", "lastOpenedDate"].includes(k))) {
      render();
    }
  });

  // As a fallback, re-render when the date flips (if tab is left open across midnight)
  let lastDate = getLocalDateString();
  setInterval(() => {
    const nowDate = getLocalDateString();
    if (nowDate !== lastDate) {
      lastDate = nowDate;
      render();
    }
  }, 30_000);

  // Initial render
  document.addEventListener("DOMContentLoaded", render);
})();
