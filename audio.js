window.SoundFX = (() => {
  let ctx = null;
  let muted = false;
  let bgm = null;

  function ensureBgm() {
    if (!bgm) {
      bgm = new Audio('music.m4a');
      bgm.loop = true;
      bgm.volume = 0.35;
      bgm.muted = muted;
    }
    return bgm;
  }

  function startMusic() {
    if (muted) return;
    const track = ensureBgm();
    if (track.paused) {
      track.play().catch(() => {});
    }
  }

  function getCtx() {
    startMusic();
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playTone({ freq = 440, type = 'sine', duration = 0.1, gain = 0.12, endFreq = null }) {
    if (muted) return;
    const ac = getCtx();
    if (!ac) return;

    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const vol = ac.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    vol.gain.setValueAtTime(gain, now);
    vol.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(vol);
    vol.connect(ac.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  return {
    isMuted: () => muted,
    startMusic,
    toggleMute: () => {
      muted = !muted;
      const track = ensureBgm();
      track.muted = muted;
      if (!muted) startMusic();
      return muted;
    },
    hit: () => playTone({ freq: 280, endFreq: 110, type: 'triangle', duration: 0.09, gain: 0.22 }),
    bounce: () => playTone({ freq: 190, endFreq: 90, type: 'sine', duration: 0.06, gain: 0.12 }),
    pointWin: () => {
      playTone({ freq: 523, type: 'triangle', duration: 0.12, gain: 0.16 });
      setTimeout(() => playTone({ freq: 659, type: 'triangle', duration: 0.16, gain: 0.16 }), 90);
    },
    pointLose: () => {
      playTone({ freq: 310, type: 'sawtooth', duration: 0.14, gain: 0.12 });
      setTimeout(() => playTone({ freq: 220, type: 'sawtooth', duration: 0.2, gain: 0.12 }), 110);
    },
    card: () => playTone({ freq: 620, endFreq: 380, type: 'sine', duration: 0.05, gain: 0.08 }),
    coin: () => playTone({ freq: 1100, endFreq: 1480, type: 'sine', duration: 0.12, gain: 0.1 }),
    uiClick: () => playTone({ freq: 480, endFreq: 260, type: 'triangle', duration: 0.035, gain: 0.07 }),
    win: () => {
      [523, 659, 784, 1046].forEach((f, i) => {
        setTimeout(() => playTone({ freq: f, type: 'triangle', duration: 0.18, gain: 0.16 }), i * 95);
      });
    },
    lose: () => {
      [340, 290, 230, 170].forEach((f, i) => {
        setTimeout(() => playTone({ freq: f, type: 'sawtooth', duration: 0.18, gain: 0.11 }), i * 110);
      });
    }
  };
})();
