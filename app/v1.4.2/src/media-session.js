// Optional OS media integration. Unsupported actions must not affect in-app playback.
export function createMediaControls(
  { session, audioSession, Metadata, artwork },
  { play, pause, stop, previous, next, seek }
) {
  let claimed = false;
  let actions = {};
  let lastPlaybackState, lastPositionKey;

  function attempt(fn) {
    try { fn(); } catch { /* Browser may not implement a particular media action. */ }
  }

  function action(name, handler) {
    if (!session || actions[name] === handler) return;
    attempt(() => session.setActionHandler(name, handler));
    actions[name] = handler;
  }

  function activate() {
    if (!claimed && audioSession) attempt(() => { audioSession.type = 'playback'; });
    claimed = true;
  }

  function sync({ index, playing, canPrevious, canNext, canSeek, duration, position, rate }) {
    if (!claimed || !session) return;
    action('play', play);
    action('pause', pause);
    action('stop', stop);
    action('previoustrack', canPrevious ? previous : null);
    action('nexttrack', canNext ? next : null);
    action('seekto', canSeek ? seek : null);
    if (Metadata && index !== actions.index) {
      attempt(() => {
        session.metadata = new Metadata({
          title: 'WFD #' + String(index + 1).padStart(3, '0'),
          artist: 'wfd.',
          album: 'Write from Dictation',
          artwork,
        });
      });
      actions.index = index;
    }
    const playbackState = playing ? 'playing' : 'paused';
    if (lastPlaybackState !== playbackState) {
      attempt(() => { session.playbackState = playbackState; });
      lastPlaybackState = playbackState;
      lastPositionKey = undefined;
    }
    if (typeof session.setPositionState === 'function') {
      attempt(() => {
        if (canSeek && Number.isFinite(duration) && duration > 0 && Number.isFinite(position) &&
            Number.isFinite(rate) && rate > 0) {
          const bounded = Math.min(duration, Math.max(0, position));
          const key = [index, duration, rate, Math.floor(bounded * 4)].join(':');
          if (lastPositionKey !== key) {
            session.setPositionState({ duration, position: bounded, playbackRate: rate });
            lastPositionKey = key;
          }
        } else if (lastPositionKey !== 'empty') {
          session.setPositionState();
          lastPositionKey = 'empty';
        }
      });
    }
  }

  function release() {
    if (!claimed) return;
    claimed = false;
    if (session) {
      for (const name of ['play', 'pause', 'stop', 'previoustrack', 'nexttrack', 'seekto']) action(name, null);
      attempt(() => { session.metadata = null; });
      attempt(() => { session.playbackState = 'none'; });
      if (typeof session.setPositionState === 'function') attempt(() => session.setPositionState());
    }
    actions = {};
    lastPlaybackState = lastPositionKey = undefined;
  }

  return { activate, sync, release };
}
