// rule_suggestions.js
(function () {
  function getLocalDateString(date = new Date()) {
    const pad = (n) => (n < 10 ? '0' + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  const STREAMING_SITES = [
    "youtube.com",
    "netflix.com",
    "twitch.tv",
    "primevideo.com",
    "hotstar.com",
    "disneyplus.com",
    "hulu.com",
    "sonyliv.com"
  ];

  /**
   * @param {Array} dailyHistory - as stored by background.js
   * @returns {Array<{id?:string,title:string,message:string}>}
   */
  function getNotificationsFromHistory(dailyHistory) {
    const notifications = [];
    if (!Array.isArray(dailyHistory) || dailyHistory.length === 0) return notifications;

    const todayStr = getLocalDateString();
    const todayData = dailyHistory.find(d => d.date === todayStr) || dailyHistory[dailyHistory.length - 1] || {};
    const totals = todayData.totals || {};
    const domains = todayData.domains || {};

    // Rule 1: Total CO₂ > 100g
    if (typeof totals.co2 === "number" && totals.co2 > 100) {
      notifications.push({
        id: "high_co2_total",
        title: "High CO₂ Usage",
        message: "Your total CO₂ usage is high today. Try taking a short break or reducing video quality."
      });
    }

    // Rule 2: Streaming > 2h across platforms
    let streamingSeconds = 0;
    for (const [domain, stats] of Object.entries(domains)) {
      const isStreaming = STREAMING_SITES.some(s => domain.includes(s));
      if (isStreaming && stats && typeof stats.seconds === "number") {
        streamingSeconds += stats.seconds;
      }
    }
    const streamingHours = streamingSeconds / 3600;
    if (streamingHours > 0.01) {
      notifications.push({
        id: "streaming_over_2h",
        title: "Streaming Tip",
        message: "You've streamed for over 2 hours today. Consider lowering resolution to save CO₂."
      });
    }

    return notifications;
  }

  self.getNotificationsFromHistory = getNotificationsFromHistory;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { getNotificationsFromHistory };
  }
})();
