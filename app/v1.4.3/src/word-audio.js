// Keep only the selected sentence decoded. Full sentence playback still uses HTMLAudioElement.
// OfflineAudioContext can decode without unlocking the device's audio output.
export function createWordAudio({
  AudioContext, OfflineAudioContext, fetchAudio, delay = 350,
  setTimer = setTimeout, clearTimer = clearTimeout,
}) {
  let url = null, generation = 0, buffer = null, pending = null, timer = null;
  let context = null, active = null;
  let mediaStarted = false, fastPathFailed = false;
  // Bootstrap the output route with real media-element progress, not merely a resolved AudioContext.resume().
  function noteMediaPlayback() { mediaStarted = true; }
  function resetOutput() { stop(); mediaStarted = false; fastPathFailed = false; }
  function stop() {
    const job = active;
    active = null;
    if (!job) return;
    clearTimer(job.watchdog);
    if (job.source) {
      job.source.onended = null;
      try { job.source.stop(); } catch {}
      try { job.source.disconnect(); } catch {}
    }
  }
  function select(next) {
    if (next === url) return;
    stop();
    generation++;
    if (timer !== null) clearTimer(timer);
    timer = null;
    if (pending) pending.abort();
    pending = null;
    buffer = null;
    url = next;
  }
  function prepare() {
    if (!url || !AudioContext || !OfflineAudioContext || buffer || pending || timer !== null) return;
    const version = generation, selected = url;
    timer = setTimer(async () => {
      timer = null;
      if (version !== generation) return;
      const controller = new AbortController();
      pending = controller;
      try {
        const response = await fetchAudio(selected, { signal: controller.signal });
        if (!response.ok) return;
        const bytes = await response.arrayBuffer();
        if (version !== generation || bytes.byteLength > 2 * 1024 * 1024) return;
        const decoder = new OfflineAudioContext(1, 1, 44100);
        // Callback + promise compatibility for older Safari implementations.
        const decoded = await new Promise((resolve, reject) => {
          const result = decoder.decodeAudioData(bytes, resolve, reject);
          if (result && typeof result.then === 'function') result.then(resolve, reject);
        });
        if (version === generation && decoded.duration > 0 && decoded.duration <= 60) buffer = decoded;
      } catch { /* Network, memory or decoder failure: use the original media element. */ }
      finally { if (pending === controller) pending = null; }
    }, delay);
  }
  function play({ from, to, rate, onEnd, onFallback }) {
    stop();
    // AudioBufferSource playbackRate changes pitch, unlike the normal player.
    // Preserve the existing pitch-corrected behavior at non-default speeds.
    if (!mediaStarted || fastPathFailed || !buffer || rate !== 1 || !AudioContext) return false;
    const start = Math.max(0, from), end = Math.min(buffer.duration, to);
    if (!(end > start)) return false;
    try {
      if (!context || context.state === 'closed') context = new AudioContext();
      const job = { source: null, start, end, started: null, watchdog: null };
      active = job;
      function fail() {
        if (active !== job) return;
        stop();
        mediaStarted = false;
        fastPathFailed = true;
        onFallback();
      }
      function begin() {
        if (active !== job) return;
        clearTimer(job.watchdog);
        try {
          if (context.state !== 'running') { fail(); return; }
          const source = context.createBufferSource();
          job.source = source;
          source.buffer = buffer;
          source.connect(context.destination);
          job.started = context.currentTime;
          source.onended = () => {
            if (active !== job) return;
            const elapsed = context.currentTime - job.started;
            // A stopped/interrupted context or an early end must not report successful playback.
            if (context.state !== 'running' || !(elapsed > 0) || elapsed + 0.025 < end - start) { fail(); return; }
            stop();
            onEnd();
          };
          source.start(0, start, end - start);
          // Prevent a stuck active state if the OS interrupts the audio context.
          job.watchdog = setTimer(fail, (end - start) * 1000 + 1000);
        } catch { fail(); }
      }
      if (context.state === 'running') begin();
      else {
        // resume() is invoked synchronously within the user's tap.
        job.watchdog = setTimer(fail, 350);
        Promise.resolve(context.resume()).then(begin, fail);
      }
      return true;
    } catch { stop(); mediaStarted = false; fastPathFailed = true; return false; }
  }
  function position() {
    if (!active) return null;
    return active.started === null ? active.start :
      Math.min(active.end, active.start + Math.max(0, context.currentTime - active.started));
  }
  return { select, prepare, play, stop, position, noteMediaPlayback, resetOutput, get ready() { return !!buffer; } };
}
