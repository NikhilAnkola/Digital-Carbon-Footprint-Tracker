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

    // --- DEBUG LOGS ---
    console.log("[Rule Debug] Today’s date:", todayStr);
    console.log("[Rule Debug] Today’s totals:", totals);
    console.log("[Rule Debug] Today’s domains:", domains);

    // Rule 1: Total CO₂ > 100g
    if (typeof totals.co2 === "number") {
      console.log("[Rule Debug] Rule 1 check → totals.co2 =", totals.co2, "threshold = 100");
      if (totals.co2 > 100) {
        notifications.push({
          id: "high_co2_total",
          title: "High CO₂ Usage",
          message: "Your total CO₂ usage is high today. Try taking a short break or reducing video quality."
        });
        console.log("[Rule Debug] Rule 1 triggered ✅");
      } else {
        console.log("[Rule Debug] Rule 1 not triggered ❌");
      }
    } else {
      console.log("[Rule Debug] Rule 1 skipped because totals.co2 is not a number:", totals.co2);
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
    console.log("[Rule Debug] Rule 2 check → total streaming hours =", streamingHours.toFixed(2), "threshold = 2h");

    if (streamingHours > 2) {
      notifications.push({
        id: "streaming_over_2h",
        title: "Streaming Tip",
        message: "You've streamed for over 2 hours today. Consider lowering resolution to save CO₂."
      });
      console.log("[Rule Debug] Rule 2 triggered ✅");
    } else {
      console.log("[Rule Debug] Rule 2 not triggered ❌");
    }

    return notifications;
  }

  self.getNotificationsFromHistory = getNotificationsFromHistory;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { getNotificationsFromHistory };
  }
})();
