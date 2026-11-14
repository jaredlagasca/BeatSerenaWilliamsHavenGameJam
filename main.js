(() => {
  const overlays = {
    title: document.getElementById('overlay-title'),
    pause: document.getElementById('overlay-pause'),
    victory: document.getElementById('overlay-victory'),
    loss: document.getElementById('overlay-loss'),
    casino: document.getElementById('overlay-casino'),
    gameover: document.getElementById('overlay-gameover')
  };

  const hudBankroll = document.getElementById('hud-bankroll');
  const hudScore = document.getElementById('hud-score');
  const hudUpgrades = document.getElementById('hud-upgrades');
  const btnSound = document.getElementById('btn-sound');
  const btnPause = document.getElementById('btn-pause');

  const victorySummary = document.getElementById('victory-summary');
  const lossSummary = document.getElementById('loss-summary');

  let bankroll = 1000;
  let difficulty = 0;
  let upgrades = { shoes: false, racket: false, band: false, magnet: false, visor: false, prize: false };
  let autoCasinoTimer = null;

  function showOverlay(name) {
    Object.entries(overlays).forEach(([key, el]) => {
      el.classList.toggle('active', key === name);
    });
  }

  function updateHUD() {
    hudBankroll.textContent = `$${bankroll.toLocaleString()}`;
    const owned = [];
    if (upgrades.shoes) owned.push('SHOES');
    if (upgrades.racket) owned.push('RACKET');
    if (upgrades.band) owned.push('BAND');
    if (upgrades.magnet) owned.push('MAGNET');
    if (upgrades.visor) owned.push('VISOR');
    if (upgrades.prize) owned.push('2X');
    hudUpgrades.textContent = owned.length ? owned.join(' · ') : 'STANDARD';
  }

  function startTennisMatch() {
    if (autoCasinoTimer) {
      clearTimeout(autoCasinoTimer);
      autoCasinoTimer = null;
    }
    showOverlay(null);
    btnPause.disabled = false;
    window.TennisGame.startMatch({ upgrades, difficulty });
  }

  function togglePause() {
    if (!window.TennisGame.isRunning()) return;
    const nextPaused = !window.TennisGame.isPaused();
    window.TennisGame.setPaused(nextPaused);
    showOverlay(nextPaused ? 'pause' : null);
    window.SoundFX.uiClick();
  }

  function enterCasino() {
    if (autoCasinoTimer) {
      clearTimeout(autoCasinoTimer);
      autoCasinoTimer = null;
    }
    btnPause.disabled = true;
    window.CasinoGame.resetTable();
    showOverlay('casino');
  }

  window.TennisGame.init(document.getElementById('tennis-canvas'), {
    onScoreChange: (pScore, sScore) => {
      hudScore.textContent = `YOU ${pScore} — ${sScore} SERENA`;
    },
    onPointWon: () => {
      bankroll += upgrades.prize ? 100 : 50;
      updateHUD();
    },
    onMatchEnd: (playerWon, pScore, sScore) => {
      btnPause.disabled = true;
      if (playerWon) {
        window.SoundFX.win();
        const prize = upgrades.prize ? 2000 : 1000;
        bankroll += prize;
        difficulty += 1;
        updateHUD();
        victorySummary.textContent = `FINAL: ${pScore} — ${sScore}`;
        const rewardEl = document.getElementById('victory-prize');
        if (rewardEl) rewardEl.textContent = `+$${prize.toLocaleString()}`;
        showOverlay('victory');
      } else {
        window.SoundFX.lose();
        lossSummary.textContent = `FINAL: ${pScore} — ${sScore}`;
        showOverlay('loss');
        autoCasinoTimer = setTimeout(() => {
          enterCasino();
        }, 1800);
      }
    }
  });

  window.CasinoGame.init({
    getBankroll: () => bankroll,
    setBankroll: (val) => {
      bankroll = Math.max(0, val);
      updateHUD();
    },
    getUpgrades: () => upgrades,
    onBuyUpgrade: (key) => {
      upgrades[key] = true;
      updateHUD();
    },
    onBuyRematch: () => {
      updateHUD();
      startTennisMatch();
    },
    onBankrupt: () => {
      window.SoundFX.lose();
      showOverlay('gameover');
    }
  });

  document.getElementById('btn-start-match').addEventListener('click', () => {
    window.SoundFX.uiClick();
    startTennisMatch();
  });
  document.getElementById('btn-play-again').addEventListener('click', () => {
    window.SoundFX.uiClick();
    startTennisMatch();
  });
  document.getElementById('btn-enter-casino').addEventListener('click', () => {
    window.SoundFX.uiClick();
    enterCasino();
  });

  btnPause.addEventListener('click', togglePause);
  document.getElementById('btn-resume-match').addEventListener('click', togglePause);
  document.getElementById('btn-quit-title').addEventListener('click', () => {
    window.SoundFX.uiClick();
    window.TennisGame.stop();
    btnPause.disabled = true;
    showOverlay('title');
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' || e.code === 'Escape') {
      togglePause();
    }
  });

  document.getElementById('btn-restart-career').addEventListener('click', () => {
    window.SoundFX.uiClick();
    bankroll = 1000;
    difficulty = 0;
    upgrades = { shoes: false, racket: false, band: false, magnet: false, visor: false, prize: false };
    updateHUD();
    startTennisMatch();
  });

  btnSound.addEventListener('click', () => {
    const muted = window.SoundFX.toggleMute();
    btnSound.textContent = muted ? 'SOUND: OFF' : 'SOUND: ON';
    if (!muted) window.SoundFX.uiClick();
  });

  const unlockAudio = () => {
    window.SoundFX.startMusic();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  updateHUD();
})();
