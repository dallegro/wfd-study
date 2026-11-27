// Use sustained measured rendering pressure, not device model or user-agent.
export function createFrameGovernor() {
  let previous = null, lastPaint = -Infinity, slow = 0, healthy = 0, limited = false;
  return {
    reset() {
      // Retain the observed mode across short audio gaps; exclude suspended time.
      previous = null;
      lastPaint = -Infinity;
      slow = healthy = 0;
    },
    shouldPaint(now) {
      if (previous !== null) {
        const delta = now - previous;
        if (delta >= 34 && delta < 1000) {
          slow++;
          healthy = 0;
          if (slow >= 6) limited = true;
        } else if (delta > 0 && delta < 25) {
          slow = Math.max(0, slow - 1);
          if (++healthy >= 60) limited = false;
        } else {
          slow = Math.max(0, slow - 1);
          healthy = 0;
        }
      }
      previous = now;
      if (limited && now - lastPaint < 50) return false;
      lastPaint = now;
      return true;
    },
    get limited() { return limited; },
  };
}

// Unknown capabilities are normal (notably Safari); start conservatively
// and let actual download timings determine the subsequent batch size.
export function offlineDownloadHint(connection, memory) {
  const restricted = !!connection?.saveData ||
    ['slow-2g', '2g', '3g'].includes(connection?.effectiveType) ||
    (Number.isFinite(memory) && memory > 0 && memory <= 2) ||
    (Number.isFinite(connection?.downlink) && connection.downlink < 1.5);
  if (restricted) return { initial: 2, maximum: 2 };
  const fast = connection?.effectiveType === '4g' &&
    Number.isFinite(connection.downlink) && connection.downlink >= 5;
  return { initial: fast ? 8 : 4, maximum: 8 };
}
