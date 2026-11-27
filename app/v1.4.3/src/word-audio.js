// Keep only the selected sentence decoded. Full sentence playback still uses HTMLAudioElement.
// OfflineAudioContext can decode without unlocking the device's audio output.
export function createWordAudio({
  AudioContext, OfflineAudioContext, fetchAudio, delay = 350,
  setTimer = setTimeout, clearTimer = clearTimeout,
}) {
  let url = null, generation = 0, buffer = null, pending = null, timer = null;
  let context = null, active = null, startup = null;
  // A slow resume belongs to the context, not the individual word request.
  // A clip may fall back while that one resume is still pending.
  // A context is owned by foreground word playback; no hidden warm-up audio.
  function resetOutput() {
    stop();
    const previous = context;
    context = null;
    startup = null;
    if (previous && previous.state !== 'closed') {
      try { Promise.resolve(previous.close()).catch(()=>{}); } catch {}
    }
  }
  function stop() {
    const job = active;
    active = null;
    if (!job) return;
    clearTimer(job.watchdog);
    if (job.context && job.stateListener) job.context.removeEventListener?.('statechange', job.stateListener);
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
  function play({ from, to, rate, allowBuffer, onStart=()=>{}, onEnd, onFallback, onError=onFallback }) {
    stop();
    // The caller applies the narrow platform compatibility policy. Lack of Audio
    // Session support alone is not a Web Audio failure.
    if (!allowBuffer || !buffer || rate !== 1 || !AudioContext) return false;
    const start = Math.max(0, from), end = Math.min(buffer.duration, to);
    if (!(end > start)) return false;
    try {
      if (!context || context.state === 'closed') context = new AudioContext();
      const ctx = context;
      // Once startup exceeded the tap's latency budget, do not impose the same
      // wait on every subsequent tap. Native playback is immediate until ready.
      if (ctx.state !== 'running' && startup?.context === ctx && startup.timedOut) return false;
      const job = { context:ctx, source:null, start, end, started:null, phase:'starting', watchdog:null, stateListener:null };
      active = job;
      function fail() {
        if (active !== job) return;
        const wasPlaying = job.phase === 'playing';
        resetOutput();
        // Do not replay a partially heard word on interruption or stall.
        if (wasPlaying) onError(); else onFallback();
      }
      function begin() {
        if (active !== job) return;
        clearTimer(job.watchdog);
        try {
          if (ctx.state !== 'running') { fail(); return; }
          const source = ctx.createBufferSource();
          job.source = source;
          source.buffer = buffer;
          source.connect(ctx.destination);
          job.started = ctx.currentTime;
          source.onended = () => {
            if (active !== job) return;
            if (ctx.state !== 'running') { fail(); return; }
            stop();
            onEnd();
          };
          source.start(0, start, end - start);
          job.phase = 'playing';
          // The scheduled source owns normal completion; this is only a liveness bound.
          job.watchdog = setTimer(fail, (end-start)*1000+2000);
          onStart();
        } catch { fail(); }
      }
      job.stateListener = () => {
        if (active !== job) return;
        if (job.phase === 'playing' && ctx.state !== 'running') fail();
        else if (job.phase === 'starting' && ctx.state === 'closed') fail();
      };
      ctx.addEventListener?.('statechange',job.stateListener);
      if (ctx.state === 'running') begin();
      else {
        // Call resume directly within the user's activation, not after a fetch/decode.
        // Preserve the v1.4.2 startup-latency bound.
        if (!startup || startup.context !== ctx) {
          const attempt = { context:ctx, timedOut:false, promise:null };
          startup = attempt;
          attempt.promise = Promise.resolve(ctx.resume()).then(
            () => { if (startup === attempt) startup = null; },
            error => {
              // Rejection after a clip timed out is still a genuine context failure.
              // Never close a context belonging to a later request.
              if (startup === attempt) {
                startup = null;
                if (!active || active.context !== ctx) resetOutput();
              }
              throw error;
            }
          );
        }
        const attempt = startup;
        job.watchdog = setTimer(() => {
          if (active !== job) return;
          if (startup === attempt) attempt.timedOut = true;
          // Cancel only the clip, not the underlying audio output initialization.
          // The stale completion handler below cannot restart this word.
          stop();
          onFallback();
        }, 350);
        attempt.promise.then(begin,fail);
      }
      return true;
    } catch { resetOutput(); return false; }
  }
  function position() {
    if (!active) return null;
    return active.started === null ? active.start :
      Math.min(active.end, active.start + Math.max(0, context.currentTime - active.started));
  }
  return { select, prepare, play, stop, position, resetOutput, get ready() { return !!buffer; } };
}
