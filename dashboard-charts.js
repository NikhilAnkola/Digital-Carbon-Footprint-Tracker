// dashboard-charts.js (updated)
// Renders Pie (today) and Bar (last 28 days, paged)

(() => {
  const DEBUG = true;

  // ---- DOM refs ----
  const pieCanvas = document.getElementById('todayPieChart');
  const pieEmpty = document.getElementById('todayPieEmpty');

  const barCanvas = document.getElementById('historyBarChart');
  const barEmpty = document.getElementById('historyBarEmpty');

  const prevBtn = document.getElementById('prev7');
  const nextBtn = document.getElementById('next7');

  const refreshBtn = document.getElementById('refreshChartsBtn');

  if (!pieCanvas || !barCanvas) return;

  // ---- Chart instances ----
  let pieChart = null;
  let barChart = null;

  // ---- Paging state for bar chart ----
  const PAGE_SIZE = 7;
  let daysSortedAsc = [];     // [{date, co2}, ...] oldest -> newest
  let pageStart = 0;

  // ---- Utils ----
  const parseDate = (d) => new Date(d + 'T00:00:00');
  const fmtShort = (d) => {
    const dt = parseDate(d);
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  function generatePalette(n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      const hue = Math.round((360 / Math.max(1, n)) * i);
      arr.push(`hsl(${hue} 70% 50%)`);
    }
    return arr;
  }

  function getTodayEntry(history) {
    if (!Array.isArray(history) || history.length === 0) return null;
    const copy = [...history].sort((a, b) => parseDate(a.date) - parseDate(b.date));
    return copy[copy.length - 1] || null;
  }

  function isDomainPlottable(host) {
    if (!host) return false;
    const ignore = new Set(['newtab', 'history', 'extensions']);
    return !ignore.has(host);
  }

  // ---- Build datasets ----
  function buildTodayPieData(today) {
    if (!today || !today.domains) return { labels: [], values: [] };
    const labels = [];
    const values = [];
    for (const [host, stats] of Object.entries(today.domains)) {
      if (!isDomainPlottable(host)) continue;
      const co2 = Number(stats?.co2 || 0);
      if (co2 > 0) {
        labels.push(host);
        values.push(co2);
      }
    }
    return { labels, values };
  }

  function build28DaySeries(history) {
    if (!Array.isArray(history)) return [];
    const items = history
      .map(d => ({ date: d.date, co2: Number(d?.totals?.co2 || 0) }))
      .filter(x => x.date)
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));
    return items.slice(-28);
  }

  // ---- Render Pie ----
  function renderPie(labels, values) {
    const hasData = labels.length > 0 && values.some(v => v > 0);

    // Use class toggling (don't mix style.display)
    pieEmpty.classList.toggle('hidden', hasData);
    pieCanvas.classList.toggle('hidden', !hasData);

    if (!hasData) {
      if (pieChart) { pieChart.destroy(); pieChart = null; }
      if (DEBUG) console.debug('[charts] renderPie: no data -> showing empty message');
      return;
    }

    if (pieChart) pieChart.destroy();

    const total = values.reduce((a, b) => a + b, 0);
    const bg = generatePalette(labels.length);

    const data = {
      labels,
      datasets: [{
        data: values,
        backgroundColor: bg,
        borderWidth: 0
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: () => '',
            label: (ctx) => {
              const label = labels[ctx.dataIndex];
              const value = values[ctx.dataIndex];
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return `${label}: ${pct}%`;
            }
          }
        }
      }
    };

    requestAnimationFrame(() => {
      try {
        pieChart = new Chart(pieCanvas.getContext('2d'), {
          type: 'pie',
          data,
          options
        });
        pieChart.update();
        if (DEBUG) console.debug('[charts] renderPie: chart created', { labels, values });
      } catch (err) {
        console.error('[charts] renderPie error', err);
      }
    });
  }

  // ---- Render Bar (paged) ----
  function updatePagerButtons() {
    if (prevBtn) prevBtn.disabled = pageStart <= 0;
    if (nextBtn) nextBtn.disabled = pageStart + PAGE_SIZE >= daysSortedAsc.length;
  }

  function renderBarPage() {
    const slice = daysSortedAsc.slice(pageStart, pageStart + PAGE_SIZE);
    const labels = slice.map(d => fmtShort(d.date));
    const values = slice.map(d => d.co2);

    const hasData = labels.length > 0 && values.some(v => v > 0);

    barEmpty.classList.toggle('hidden', hasData);
    barCanvas.classList.toggle('hidden', !hasData);

    if (!hasData) {
      if (barChart) { barChart.destroy(); barChart = null; }
      updatePagerButtons();
      if (DEBUG) console.debug('[charts] renderBarPage: no data for current page');
      return;
    }

    if (barChart) barChart.destroy();

    const data = {
      labels,
      datasets: [{
        label: 'CO₂ (g)',
        data: values,
        backgroundColor: 'hsl(210 70% 50%)',
        borderWidth: 0
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `CO₂: ${Math.round(ctx.parsed.y)} g`
          }
        }
      },
      scales: {
        x: { ticks: { autoSkip: false } },
        y: { beginAtZero: true }
      }
    };

    requestAnimationFrame(() => {
      try {
        barChart = new Chart(barCanvas.getContext('2d'), {
          type: 'bar',
          data,
          options
        });
        barChart.update();
        updatePagerButtons();
        if (DEBUG) console.debug('[charts] renderBarPage: chart created', { labels, values, pageStart });
      } catch (err) {
        console.error('[charts] renderBarPage error', err);
      }
    });
  }

  // ---- Data fetch + render all ----
  function refreshFromStorage() {
    chrome.storage.local.get(['dailyHistory'], (res) => {
      const history = Array.isArray(res.dailyHistory) ? res.dailyHistory : [];
      if (DEBUG) {
        console.debug('[charts] refreshFromStorage: loaded dailyHistory length=', history.length);
        console.debug('[charts] dailyHistory sample:', history.slice(-3));
      }

      const today = getTodayEntry(history);
      const { labels, values } = buildTodayPieData(today);
      if (DEBUG) console.debug('[charts] today pie ->', { labels, values });

      renderPie(labels, values);

      daysSortedAsc = build28DaySeries(history);

      // adjust pageStart so we remain in valid range (show latest page by default)
      const lastStart = Math.max(0, daysSortedAsc.length - PAGE_SIZE);
      if (pageStart > lastStart) pageStart = lastStart;
      if (daysSortedAsc.length <= PAGE_SIZE) pageStart = 0;

      renderBarPage();
    });
  }

  // ---- Wire pager buttons ----
  if (prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => {
      pageStart = Math.max(0, pageStart - PAGE_SIZE);
      renderBarPage();
    });
    nextBtn.addEventListener('click', () => {
      pageStart = Math.min(Math.max(0, daysSortedAsc.length - PAGE_SIZE), pageStart + PAGE_SIZE);
      renderBarPage();
    });
  }

  // ---- Refresh button ----
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => refreshFromStorage());
  }

  // First load when extension page opens
  refreshFromStorage();
})();
