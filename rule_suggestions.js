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
    if (streamingHours > 2) {
      notifications.push({
        id: "streaming_over_2h",
        title: "Streaming Tip",
        message: "You've streamed for over 2 hours today. Consider lowering resolution to save CO₂."
      });
    }

    // Rule 3: Positive reinforcement if CO₂ < 100g
    if (typeof totals.co2 === "number" && totals.co2 < 100) {
      notifications.push({
        id: "low_co2_positive",
        title: "Great Job!",
        message: "You're keeping CO₂ emissions low today. Keep it up!"
      });
    }

    // Rule 4: Data usage > 1GB
    if (typeof totals.gb === "number" && totals.gb > 1) {
      notifications.push({
        id: "high_data_usage",
        title: "High Data Usage",
        message: "You've used over 1GB today. Try enabling data saver or lowering video resolution."
      });
    }

    // Rule 5: Idle time warning (> 3h total)
    if (typeof totals.seconds === "number" && totals.seconds > 10800) {
      notifications.push({
        id: "long_usage",
        title: "Time for a Break?",
        message: "You've been online for over 3 hours today. Take a short break for your health!"
      });
    }

    // Rule 6: Streak motivation (last 3 days < 300g)
    const last3 = dailyHistory.slice(-3);
    if (last3.length === 3 && last3.every(d => (d.totals?.co2 || 0) < 300)) {
      notifications.push({
        id: "streak_motivation",
        title: "Awesome Streak!",
        message: "3 days in a row with CO₂ under 300g. Keep going strong!"
      });
    }

    // Rule 7: Specific streaming site > 1h
    for (const site of ["youtube.com", "netflix.com"]) {
      const siteData = domains[site];
      if (siteData && typeof siteData.seconds === "number" && siteData.seconds > 3600) {
        notifications.push({
          id: `${site}_limit_suggestion`,
          title: `${site} Usage`,
          message: `You've spent over 1 hour on ${site}. Maybe time for a break?`
        });
      }
    }

    return notifications;
  }

  self.getNotificationsFromHistory = getNotificationsFromHistory;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { getNotificationsFromHistory };
  }
})();
