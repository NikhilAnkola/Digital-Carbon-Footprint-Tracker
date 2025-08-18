// dashboard-charts.js
// Renders:
//  - Pie chart for today's CO₂ share by domain (hover shows site + % only)
//  - Bar chart for last 28 days CO₂ (7 days per page, prev/next buttons)

(() => {
  // ---- DOM refs ----
  const pieCanvas = document.getElementById('todayPieChart');
  const pieEmpty = document.getElementById('todayPieEmpty');

  const barCanvas = document.getElementById('historyBarChart');
  const barEmpty = document.getElementById('historyBarEmpty');

  const prevBtn = document.getElementById('prev7');
  const nextBtn = document.getElementById('next7');

  const refreshBtn = document.getElementById('refreshChartsBtn'); // NEW

  if (!pieCanvas || !barCanvas) {
    // If you haven't added the chart sections to the HTML yet, bail silently
    return;
  }

  // ---- Chart instances ----
  let pieChart = null;
  let barChart = null;

  // ---- Paging state for bar chart (7 days per page) ----
  const PAGE_SIZE = 7;
  let daysSortedAsc = [];     // [{date, co2}, ...] oldest -> newest
  let pageStart = 0;          // index into daysSortedAsc

  // ---- Utils ----
  const parseDate = (d) => new Date(d + 'T00:00:00'); // safe local midnight
  const fmtShort = (d) => {
    // format as "Aug 16" or "MM-DD" if you prefer
    const dt = parseDate(d);
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  function generatePalette(n) {
    // Distinct HSL hues for the pie slices
    const arr = [];
    for (let i = 0; i < n; i++) {
      const hue = Math.round((360 / Math.max(1, n)) * i);
      arr.push(`hsl(${hue} 70% 55%)`);
    }
    return arr;
  }

  function getTodayEntry(history) {
    if (!Array.isArray(history) || history.length === 0) return null;
    // pick the max date to be safe
    const copy = [...history].sort((a, b) => parseDate(a.date) - parseDate(b.date));
    return copy[copy.length - 1] || null;
  }

  // Filter helper to avoid noise entries if you want
  function isDomainPlottable(host) {
    if (!host) return false;
    const ignore = new Set(['newtab', 'history', 'extensions']);
    if (ignore.has(host)) return false;
    return true;
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
      .sort((a, b) => parseDate(a.date) - parseDate(b.date)); // oldest -> newest
    return items.slice(-28); // keep only last 28 entries
  }

  // ---- Render Pie ----
  function renderPie(labels, values) {
    const hasData = labels.length > 0 && values.some(v => v > 0);
    pieCanvas.style.display = hasData ? 'block' : 'none';
    pieEmpty.classList.toggle('hidden', hasData);

    if (!hasData) {
      if (pieChart) { pieChart.destroy(); pieChart = null; }
      return;
    }

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

    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCanvas.getContext('2d'), {
      type: 'pie',
      data,
      options
    });
  }

  // ---- Render Bar (paged) ----
  function updatePagerButtons() {
    prevBtn.disabled = pageStart <= 0;
    nextBtn.disabled = pageStart + PAGE_SIZE >= daysSortedAsc.length;
  }

  function renderBarPage() {
    const slice = daysSortedAsc.slice(pageStart, pageStart + PAGE_SIZE);
    const labels = slice.map(d => fmtShort(d.date));
    const values = slice.map(d => d.co2);

    const hasData = labels.length > 0 && values.some(v => v > 0);
    barCanvas.style.display = hasData ? 'block' : 'none';
    barEmpty.classList.toggle('hidden', hasData);

    if (!hasData) {
      if (barChart) { barChart.destroy(); barChart = null; }
      updatePagerButtons();
      return;
    }

    const data = {
      labels,
      datasets: [{
        label: 'CO₂ (g)',
        data: values,
        backgroundColor: 'hsl(210 70% 55%)',
        borderWidth: 0
      }]
    };

    const options = {
      responsive: true,
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

    if (barChart) barChart.destroy();
    barChart = new Chart(barCanvas.getContext('2d'), {
      type: 'bar',
      data,
      options
    });

    updatePagerButtons();
  }

  // ---- Data fetch + render all ----
  function refreshFromStorage() {
    chrome.storage.local.get(['dailyHistory'], (res) => {
      const history = Array.isArray(res.dailyHistory) ? res.dailyHistory : [];

      const today = getTodayEntry(history);
      const { labels, values } = buildTodayPieData(today);
      renderPie(labels, values);

      daysSortedAsc = build28DaySeries(history);

      const lastStart = Math.max(0, daysSortedAsc.length - PAGE_SIZE);
      pageStart = Math.min(pageStart, lastStart);
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
      pageStart = Math.min(daysSortedAsc.length - PAGE_SIZE, pageStart + PAGE_SIZE);
      renderBarPage();
    });
  }

  // ---- Refresh button ----
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshFromStorage();
    });
  }

  // ---- Removed auto-refresh listeners ----
  // ❌ no chrome.storage.onChanged
  // ❌ no setInterval

  // First load when extension page opens
  refreshFromStorage();
})();
