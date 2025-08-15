function checkAndAlertSuggestionsFromHistory(dailyHistory) {
    if (!dailyHistory || dailyHistory.length === 0) return;

    const todayData = dailyHistory[0]; // Most recent day
    const totals = todayData.totals || {};
    const domains = todayData.domains || {};

    // Rule 1: Total CO₂ > 100g
    if (totals.co2 > 76) {
        alert("Your CO₂ usage is high today. Try taking a short break from streaming.");
    }

    // Rule 2: Streaming > 2 hours
    const streamingSites = ["youtube.com", "netflix.com", "twitch.tv", "primevideo.com", "hotstar.com"];
    let streamingSeconds = 0;

    for (const site of streamingSites) {
        if (domains[site]) {
            streamingSeconds += domains[site].seconds;
        }
    }

    const streamingHours = streamingSeconds / 3600;
    if (streamingHours > 2) {
        alert("You've streamed over 2 hours. Consider lowering resolution to save CO₂.");
    }

    // Add more rules as needed
}

// For Node.js / background.js compatibility
if (typeof window === "undefined") {
    module.exports = { checkAndAlertSuggestionsFromHistory };
}
