// content_video.js
// Injected into streaming pages (YouTube, Netflix, Twitch...). Sends periodic stats to background.

(function () {
  const domain = location.hostname.replace(/^www\./, "");
  let lastSent = 0;

  function getVideoElement() {
    return document.querySelector('video');
  }

  function getResolutionFromVideo(video) {
    if (!video) return null;
    // video.videoHeight is the most direct way to get current playback height (e.g., 720, 1080, 2160)
    const h = video.videoHeight;
    return (typeof h === 'number' && h > 0) ? h : null;
  }

  function getAvgRequestSizeMB() {
    try {
      const resources = performance.getEntriesByType('resource');
      if (!resources || resources.length === 0) return null;
      let total = 0, count = 0;
      resources.forEach(r => {
        if (r.transferSize && typeof r.transferSize === 'number' && r.transferSize > 0) {
          total += r.transferSize;
          count++;
        }
      });
      if (count === 0) return null;
      return (total / count) / (1024 * 1024); // MB
    } catch (e) {
      return null;
    }
  }

  function collectAndSend() {
    const now = Date.now();
    // throttle: at most once every 3000 ms
    if (now - lastSent < 3000) return;
    lastSent = now;

    const video = getVideoElement();
    const resolution = getResolutionFromVideo(video); // e.g., 720, 1080, 2160
    const downlink = (navigator.connection && navigator.connection.downlink) ? navigator.connection.downlink : null; // Mbps
    const avgReqMB = getAvgRequestSizeMB(); // MB

    const payload = {
      type: 'VIDEO_STATS',
      domain,
      resolution, // number or null
      downlink,   // number (Mbps) or null
      avgReqMB,   // number (MB) or null
      timestamp: now
    };

    // send message to background (service worker will wake on message)
    try {
      chrome.runtime.sendMessage(payload);
    } catch (e) {
      // ignore - extension might not be active
    }
  }

  // Periodic polling (covers most streaming pages)
  const pollInterval = setInterval(collectAndSend, 3000);

  // Also try to detect changes quickly using MutationObserver on player area (YouTube etc.)
  const root = document.querySelector('#player') || document.body;
  const observer = new MutationObserver(() => collectAndSend());
  observer.observe(root, { subtree: true, childList: true, attributes: true });

  // Clean up on navigation/unload
  window.addEventListener('beforeunload', () => {
    clearInterval(pollInterval);
    observer.disconnect();
  });

  // Run once immediately
  collectAndSend();
})();