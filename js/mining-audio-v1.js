(() => {
  let context, buffer, rubble, sign, batHurt, loading, last = -Infinity, lastSign = -Infinity, lastBatHurt = -Infinity, voice, slideVoice;
  let batch = 0, timer = null, board = null, slideUntil = 0;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  function unlock() {
    if (!AudioContext) return;
    try {
      context ||= new AudioContext();
      if (context.state === 'suspended') context.resume().catch(() => {});
      if (!loading) loading = Promise.all(['mining','rockslide-8bit-gorogoro-v3-eq','sign-place-to-v6','bat-hurt-v1'].map(name =>
        fetch('./assets/audio/'+name+'.wav')
        .then(r => { if (!r.ok) throw new Error('Audio unavailable'); return r.arrayBuffer(); })
        .then(bytes => context.decodeAudioData(bytes))))
        .then(decoded => { [buffer,rubble,sign,batHurt] = decoded; })
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
  const toggleFlag = DD.systems.toggleFlag;
  DD.systems.toggleFlag = function(x,y) {
    const tile = DD.state.board?.grid?.[y]?.[x];
    const before = tile?.flagged;
    const result = toggleFlag.call(this,x,y);
    if (tile && !before && tile.flagged && sign && context?.state === 'running' && !document.hidden) {
      const now = context.currentTime;
      if (now - lastSign >= .08) {
        lastSign = now;
        const source = context.createBufferSource();
        source.buffer = sign;
        source.connect(context.destination);
        source.start();
      }
    }
    return result;
  };
  const hit = DD.expansion.hit;
  DD.expansion.hit = function(enemy,damage) {
    const actual = hit.call(this,enemy,damage);
    if (enemy?.type === 'bat' && actual > 0 && batHurt && context?.state === 'running' && !document.hidden) {
      const now = context.currentTime;
      if (now - lastBatHurt >= .09) {
        lastBatHurt = now;
        const source = context.createBufferSource();
        source.buffer = batHurt;
        source.connect(context.destination);
        source.start();
      }
    }
    return actual;
  };
})();
