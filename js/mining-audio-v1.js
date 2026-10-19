(() => {
  let context, buffer, rubble, loading, last = -Infinity, voice, slideVoice;
  let batch = 0, timer = null, board = null, slideUntil = 0;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  function unlock() {
    if (!AudioContext) return;
    try {
      context ||= new AudioContext();
      if (context.state === 'suspended') context.resume().catch(() => {});
      if (!loading) loading = Promise.all(['mining','rockslide-8bit-gorogoro-v3-eq'].map(name =>
        fetch('./assets/audio/'+name+'.wav')
        .then(r => { if (!r.ok) throw new Error('Audio unavailable'); return r.arrayBuffer(); })
        .then(bytes => context.decodeAudioData(bytes))))
        .then(decoded => { [buffer,rubble] = decoded; })
        .catch(() => { loading = null; });
    } catch (_) { /* Audio must never interrupt gameplay. */ }
  }
  document.addEventListener('pointerdown', unlock, {capture:true, passive:true});
  document.addEventListener('keydown', unlock, {capture:true});
  function play(count) {
    if (!buffer || context.state !== 'running' || document.hidden) return;
    const now = context.currentTime;
    if (count >= 4 && rubble) {
      if (now < slideUntil) return;
      if (voice) { try { voice.stop(); } catch (_) {} }
      slideVoice = context.createBufferSource();
      slideVoice.buffer = rubble;
      slideVoice.connect(context.destination);
      slideVoice.start();
      slideUntil = now + rubble.duration;
      last = now;
      return;
    }
    if (now < slideUntil) return;
    // Keep zero-cell cascades quiet: one voice, at most four sounds per second.
    if (now-last < .25) return;
    last = now;
    if (voice) { try { voice.stop(); } catch (_) {} }
    voice = context.createBufferSource();
    voice.buffer = buffer;
    voice.connect(context.destination);
    voice.start();
  }
  const reveal = DD.expansion.reveal;
  DD.expansion.reveal = function(...args) {
    const opened = reveal.apply(this,args);
    if (opened) {
      if (board !== DD.state.board) { board=DD.state.board; batch=0; if(timer)clearTimeout(timer); timer=null; }
      batch++;
      if (!timer) timer=setTimeout(() => {
        const count=batch; batch=0; timer=null;
        if (board===DD.state.board) play(count);
      },80);
    }
    return opened;
  };
})();
