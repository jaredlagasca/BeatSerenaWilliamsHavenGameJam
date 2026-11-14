window.TennisGame = (() => {
  const COURT = {
    left: 206,
    right: 701,
    top: 43,
    bottom: 576,
    netY: 310,
    width: 495,
    height: 533
  };

  const POINTS_TO_WIN = 5;
  const GRAVITY = 940;

  let canvas, ctx;
  let rafId = null;
  let lastTime = 0;
  let running = false;
  let paused = false;

  let camX = 0;
  let camY = 0;
  let shakeMag = 0;
  let bounceSquash = 0;

  const keys = {};
  const particles = [];
  const ballTrail = [];

  const courtImg = new Image();
  courtImg.src = 'court.png';
  let courtImgReady = false;
  courtImg.onload = () => { courtImgReady = true; };

  const playerImg = new Image();
  playerImg.src = 'player.png';
  let playerImgReady = false;
  playerImg.onload = () => { playerImgReady = true; };

  const serenaImg = new Image();
  serenaImg.src = 'serena.png';
  let serenaImgReady = false;
  serenaImg.onload = () => { serenaImgReady = true; };

  const racketImg = new Image();
  racketImg.src = 'racket.png';
  let racketImgReady = false;
  racketImg.onload = () => { racketImgReady = true; };

  let state = {
    playerScore: 0,
    serenaScore: 0,
    difficulty: 0,
    upgrades: { shoes: false, racket: false, band: false, magnet: false, visor: false, prize: false },
    server: 'player',
    phase: 'serve',
    bannerText: '',
    bannerSub: '',
    phaseTimer: 0,
    lastHitter: null,
    bouncesSinceHit: 0
  };

  const player = {
    x: 450,
    y: 490,
    vx: 0,
    vy: 0,
    radius: 17,
    swingTimer: 0,
    swingDuration: 0.30,
    swingCooldown: 0,
    stride: 0
  };

  const serena = {
    x: 450,
    y: 130,
    vx: 0,
    vy: 0,
    radius: 18,
    swingTimer: 0,
    swingDuration: 0.25,
    swingCooldown: 0,
    targetX: 450,
    targetY: 130,
    stride: 0
  };

  const ball = {
    x: 450,
    y: 470,
    z: 18,
    vx: 0,
    vy: 0,
    vz: 0,
    radius: 7
  };

  let callbacks = {
    onScoreChange: () => {},
    onPointWon: () => {},
    onMatchEnd: () => {}
  };

  function init(canvasEl, cb) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    callbacks = cb || callbacks;

    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      if (running && !paused && (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'Enter')) {
        e.preventDefault();
        triggerPlayerAction();
      }
    });

    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
    });

    canvas.addEventListener('mousedown', () => {
      if (running && !paused) triggerPlayerAction();
    });
  }

  function startMatch({ upgrades, difficulty = 0 }) {
    state.playerScore = 0;
    state.serenaScore = 0;
    state.difficulty = difficulty;
    state.upgrades = { ...upgrades };
    state.server = 'player';
    particles.length = 0;
    ballTrail.length = 0;
    camX = 0;
    camY = 0;
    shakeMag = 0;
    bounceSquash = 0;
    paused = false;
    running = true;

    callbacks.onScoreChange(state.playerScore, state.serenaScore);
    setupPoint();

    lastTime = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function setPaused(val) {
    paused = !!val;
    if (!paused) {
      lastTime = performance.now();
    }
  }

  function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function setupPoint() {
    player.x = 450;
    player.y = 490;
    player.vx = 0;
    player.vy = 0;
    player.swingTimer = 0;
    player.swingCooldown = 0;

    serena.x = 450;
    serena.y = 130;
    serena.vx = 0;
    serena.vy = 0;
    serena.swingTimer = 0;
    serena.swingCooldown = 0;
    serena.targetX = 450;
    serena.targetY = 130;

    ballTrail.length = 0;
    state.phase = 'serve';
    state.bouncesSinceHit = 0;
    state.lastHitter = state.server;

    if (state.server === 'player') {
      ball.x = player.x + 18;
      ball.y = player.y - 16;
      ball.z = 26;
      ball.vx = 0;
      ball.vy = 0;
      ball.vz = 0;
      state.bannerText = 'YOUR SERVE';
      state.bannerSub = 'Press SPACE or Click to serve!';
    } else {
      ball.x = serena.x - 18;
      ball.y = serena.y + 16;
      ball.z = 26;
      ball.vx = 0;
      ball.vy = 0;
      ball.vz = 0;
      state.phaseTimer = 0.9;
      state.bannerText = "SERENA'S SERVE";
      state.bannerSub = 'Watch the landing target ring!';
    }
  }

  function triggerPlayerAction() {
    if (state.phase === 'serve' && state.server === 'player') {
      serveBall('player');
      return;
    }
    if (player.swingCooldown <= 0) {
      const swingDuration = state.upgrades.band ? 0.40 : 0.30;
      player.swingDuration = swingDuration;
      player.swingTimer = swingDuration;
      player.swingCooldown = 0.28;
    }
  }

  function spawnParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 140;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.55,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  function serveBall(who) {
    state.phase = 'rally';
    state.bannerText = '';
    state.bannerSub = '';
    state.bouncesSinceHit = 0;
    state.lastHitter = who;
    ballTrail.length = 0;
    window.SoundFX.hit();

    if (who === 'player') {
      player.swingDuration = 0.26;
      player.swingTimer = 0.26;
      const aimX = (keys['ArrowLeft'] || keys['KeyA'] ? -125 : 0) +
                   (keys['ArrowRight'] || keys['KeyD'] ? 125 : 0);
      const speedBoost = state.upgrades.racket ? 1.15 : 1.0;
      ball.x = player.x + 14;
      ball.y = player.y - 18;
      ball.z = 36;
      ball.vx = aimX + (450 - player.x) * 0.3;
      ball.vy = -440 * speedBoost;
      ball.vz = 190;
      spawnParticles(ball.x, ball.y - ball.z, '#fef08a', 12);
    } else {
      serena.swingDuration = 0.24;
      serena.swingTimer = 0.24;
      const targetSide = Math.random() < 0.5 ? -1 : 1;
      const targetX = 450 + targetSide * (85 + Math.random() * 90);
      const visorMult = state.upgrades.visor ? 1.16 : 1.0;
      const flightTime = 0.92 * visorMult;
      ball.x = serena.x - 14;
      ball.y = serena.y + 18;
      ball.z = 38;
      ball.vx = (targetX - ball.x) / flightTime;
      ball.vy = (445 - ball.y) / flightTime;
      ball.vz = 205;
      spawnParticles(ball.x, ball.y - ball.z, '#f472b6', 10);
    }
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;

    if (!paused) {
      update(dt);
    }
    render();

    if (running) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function update(dt) {

    const targetCamX = Math.max(-12, Math.min(12, (450 - ball.x) * 0.035));
    const targetCamY = Math.max(-6, Math.min(6, (315 - ball.y) * 0.025));
    camX += (targetCamX - camX) * Math.min(1, dt * 6);
    camY += (targetCamY - camY) * Math.min(1, dt * 6);
    shakeMag = Math.max(0, shakeMag - dt * 28);
    bounceSquash = Math.max(0, bounceSquash - dt * 5);

    updateParticles(dt);
    updatePlayer(dt);

    if (state.phase === 'serve') {
      if (state.server === 'player') {
        ball.x = player.x + 18;
        ball.y = player.y - 16;
        ball.z = 24 + Math.sin(performance.now() * 0.006) * 4;
      } else {
        state.phaseTimer -= dt;
        ball.x = serena.x - 18;
        ball.y = serena.y + 16;
        if (state.phaseTimer <= 0) {
          serveBall('serena');
        }
      }
      return;
    }

    if (state.phase === 'point_over') {
      state.phaseTimer -= dt;
      if (state.phaseTimer <= 0) {
        if (state.playerScore >= POINTS_TO_WIN) {
          running = false;
          callbacks.onMatchEnd(true, state.playerScore, state.serenaScore);
          return;
        }
        if (state.serenaScore >= POINTS_TO_WIN) {
          running = false;
          callbacks.onMatchEnd(false, state.playerScore, state.serenaScore);
          return;
        }
        state.server = state.server === 'player' ? 'serena' : 'player';
        setupPoint();
      }
      return;
    }

    updateSerena(dt);
    updateBall(dt);
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function getPlayerReach() {
    let reach = 42;
    if (state.upgrades.racket) reach += 10;
    if (state.upgrades.magnet) reach += 12;
    return reach;
  }

  function updatePlayer(dt) {
    let dx = 0;
    let dy = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
    if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
    if (keys['ArrowDown'] || keys['KeyS']) dy += 1;

    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }

    const baseSpeed = 345 * (state.upgrades.shoes ? 1.25 : 1.0);
    player.vx = dx * baseSpeed;
    player.vy = dy * baseSpeed;
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    if (dx !== 0 || dy !== 0) {
      player.stride += dt * 14;
    }

    player.x = Math.max(65, Math.min(835, player.x));
    player.y = Math.max(COURT.netY + 26, Math.min(585, player.y));

    if (player.swingTimer > 0) player.swingTimer = Math.max(0, player.swingTimer - dt);
    if (player.swingCooldown > 0) player.swingCooldown = Math.max(0, player.swingCooldown - dt);

    if (state.phase === 'rally' && state.upgrades.magnet && state.lastHitter === 'serena') {
      const dist = Math.hypot(ball.x - player.x, ball.y - player.y);
      if (dist < 130 && dist > 10) {
        ball.x += ((player.x - ball.x) / dist) * 95 * dt;
        ball.y += ((player.y - ball.y) / dist) * 95 * dt;
      }
    }

    if (state.phase === 'rally' && player.swingTimer > 0 && state.lastHitter !== 'player') {
      const reach = getPlayerReach();
      const dist = Math.hypot(ball.x - player.x, ball.y - player.y);
      if (dist <= reach && ball.z <= 45) {
        hitBallByPlayer();
      }
    }
  }

  function hitBallByPlayer() {
    state.lastHitter = 'player';
    state.bouncesSinceHit = 0;
    shakeMag = Math.max(shakeMag, state.upgrades.racket ? 5.5 : 3.5);
    window.SoundFX.hit();
    spawnParticles(ball.x, ball.y - ball.z, '#fef08a', 14);

    const powerMult = state.upgrades.racket ? 1.2 : 1.0;
    const forwardBonus = (keys['ArrowUp'] || keys['KeyW']) ? 1.1 : 1.0;

    let steerX = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) steerX = -215;
    else if (keys['ArrowRight'] || keys['KeyD']) steerX = 215;
    else steerX = (450 - player.x) * 0.45;

    ball.vx = steerX * powerMult;
    ball.vy = -445 * powerMult * forwardBonus;
    ball.vz = 235 + (player.y - COURT.netY) * 0.1;
  }

  function updateSerena(dt) {
    if (serena.swingTimer > 0) serena.swingTimer = Math.max(0, serena.swingTimer - dt);
    if (serena.swingCooldown > 0) serena.swingCooldown = Math.max(0, serena.swingCooldown - dt);

    const serenaSpeed = 240 + state.difficulty * 35;

    if (ball.vy < 0 && state.lastHitter === 'player') {
      const timeToSerena = Math.max(0.05, (130 - ball.y) / ball.vy);
      const predictedX = ball.x + ball.vx * Math.min(timeToSerena, 0.72);
      serena.targetX = Math.max(115, Math.min(785, predictedX));
      serena.targetY = Math.max(85, Math.min(240, ball.y < 230 ? ball.y - 18 : 130));
    } else {
      serena.targetX = 450;
      serena.targetY = 130;
    }

    const dx = serena.targetX - serena.x;
    const dy = serena.targetY - serena.y;
    const distToTarget = Math.hypot(dx, dy);

    if (distToTarget > 4) {
      const step = Math.min(distToTarget, serenaSpeed * dt);
      serena.x += (dx / distToTarget) * step;
      serena.y += (dy / distToTarget) * step;
      serena.stride += dt * 12;
    }

    if (state.lastHitter === 'player' && serena.swingCooldown <= 0) {
      const distToBall = Math.hypot(ball.x - serena.x, ball.y - serena.y);
      if (distToBall <= 54 && ball.z <= 60 && ball.y < COURT.netY - 12) {
        hitBallBySerena();
      }
    }
  }

  function hitBallBySerena() {
    state.lastHitter = 'serena';
    state.bouncesSinceHit = 0;
    serena.swingDuration = 0.24;
    serena.swingTimer = 0.24;
    serena.swingCooldown = 0.36;
    window.SoundFX.hit();
    spawnParticles(ball.x, ball.y - ball.z, '#f472b6', 12);

    const openSideX = player.x < 450
      ? 490 + Math.random() * 145
      : 265 + Math.random() * 145;
    const targetY = 445 + Math.random() * 65;
    const speedFactor = (1 + state.difficulty * 0.07) * (state.upgrades.visor ? 0.85 : 1.0);
    const flightTime = (0.94 - Math.min(0.18, state.difficulty * 0.03)) / speedFactor;

    ball.vx = (openSideX - ball.x) / flightTime;
    ball.vy = (targetY - ball.y) / flightTime;
    ball.vz = 235;
  }

  function updateBall(dt) {
    ballTrail.push({ x: ball.x, y: ball.y - ball.z });
    if (ballTrail.length > 9) ballTrail.shift();

    const prevY = ball.y;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.z += ball.vz * dt;
    ball.vz -= GRAVITY * dt;

    if ((prevY < COURT.netY && ball.y >= COURT.netY) || (prevY > COURT.netY && ball.y <= COURT.netY)) {
      if (ball.z < 14) {
        shakeMag = Math.max(shakeMag, 6);
        window.SoundFX.bounce();
        spawnParticles(ball.x, COURT.netY - 10, '#f4efe6', 10);
        const winner = state.lastHitter === 'player' ? 'serena' : 'player';
        awardPoint(winner, 'INTO THE NET!');
        return;
      }
    }

    if (ball.z <= 0) {
      ball.z = 0;
      ball.vz = Math.abs(ball.vz) * 0.72;
      ball.vx *= 0.94;
      ball.vy *= 0.94;
      bounceSquash = 1;
      state.bouncesSinceHit += 1;
      window.SoundFX.bounce();
      spawnParticles(ball.x, ball.y, '#d9f99d', 7);

      if (state.bouncesSinceHit === 1) {
        const inX = ball.x >= COURT.left - 8 && ball.x <= COURT.right + 8;
        const onSerenaSide = ball.y >= COURT.top - 8 && ball.y < COURT.netY;
        const onPlayerSide = ball.y > COURT.netY && ball.y <= COURT.bottom + 8;

        if (state.lastHitter === 'player') {
          if (!inX || !onSerenaSide) {
            awardPoint('serena', 'OUT!');
            return;
          }
        } else if (state.lastHitter === 'serena') {
          if (!inX || !onPlayerSide) {
            awardPoint('player', 'SERENA HIT IT OUT!');
            return;
          }
        }
      } else if (state.bouncesSinceHit >= 2) {
        const winner = state.lastHitter === 'player' ? 'player' : 'serena';
        awardPoint(winner, winner === 'player' ? 'WINNER!' : 'DOUBLE BOUNCE!');
        return;
      }
    }

    if (ball.x < -40 || ball.x > 940 || ball.y < -40 || ball.y > 660) {
      const winner = state.lastHitter === 'player' ? 'serena' : 'player';
      awardPoint(winner, 'OUT OF BOUNDS!');
    }
  }

  function awardPoint(winner, reason) {
    if (state.phase !== 'rally') return;
    state.phase = 'point_over';
    state.phaseTimer = 1.25;

    if (winner === 'player') {
      state.playerScore += 1;
      state.bannerText = 'POINT YOU!';
      state.bannerSub = reason;
      window.SoundFX.pointWin();
      callbacks.onPointWon();
    } else {
      state.serenaScore += 1;
      state.bannerText = 'POINT SERENA!';
      state.bannerSub = reason;
      window.SoundFX.pointLose();
    }

    callbacks.onScoreChange(state.playerScore, state.serenaScore);
  }

  function getPredictedLanding() {
    if (state.phase !== 'rally' || ball.vy <= 0 || state.bouncesSinceHit > 0) return null;
    const disc = ball.vz * ball.vz + 2 * GRAVITY * Math.max(0, ball.z);
    const tToGround = (ball.vz + Math.sqrt(disc)) / GRAVITY;
    return {
      x: ball.x + ball.vx * tToGround,
      y: ball.y + ball.vy * tToGround,
      t: tToGround
    };
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sx = (Math.random() - 0.5) * shakeMag * 2;
    const sy = (Math.random() - 0.5) * shakeMag * 2;

    ctx.save();
    ctx.translate(camX + sx, camY + sy);

    ctx.fillStyle = '#274e13';
    ctx.fillRect(-30, -30, canvas.width + 60, canvas.height + 60);

    if (courtImgReady) {
      ctx.drawImage(courtImg, 0, 0, canvas.width, canvas.height);
    }

    const landing = getPredictedLanding();
    if (landing) {
      const pulse = 1 + Math.sin(performance.now() * 0.014) * 0.14;
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(landing.x, landing.y, 15 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(landing.x - 7, landing.y);
      ctx.lineTo(landing.x + 7, landing.y);
      ctx.moveTo(landing.x, landing.y - 7);
      ctx.lineTo(landing.x, landing.y + 7);
      ctx.stroke();
      ctx.restore();
    }

    if (state.phase === 'rally' && state.lastHitter === 'serena') {
      const reach = getPlayerReach();
      const dist = Math.hypot(ball.x - player.x, ball.y - player.y);
      if (dist <= reach + 14) {
        ctx.save();
        ctx.strokeStyle = dist <= reach && ball.z <= 45 ? 'rgba(74, 222, 128, 0.85)' : 'rgba(251, 191, 36, 0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(player.x, player.y, reach, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    drawAthlete(serena, {
      jersey: '#db2777',
      trim: '#fbcfe8',
      skin: '#8d5524',
      hair: '#1e1b4b',
      label: 'SERENA',
      isTop: true,
      hasVisor: true
    });

    drawAthlete(player, {
      jersey: '#0284c7',
      trim: '#bae6fd',
      skin: '#f1c27d',
      hair: '#1e293b',
      label: 'YOU',
      isTop: false,
      hasVisor: state.upgrades.visor,
      hasBand: state.upgrades.band,
      goldRacket: state.upgrades.racket,
      goldShoes: state.upgrades.shoes
    });

    for (let i = 0; i < ballTrail.length; i++) {
      const pt = ballTrail[i];
      const alpha = ((i + 1) / ballTrail.length) * 0.35;
      ctx.fillStyle = `rgba(217, 249, 157, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4 * ((i + 1) / ballTrail.length), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y, Math.max(4, ball.radius - ball.z * 0.03), Math.max(2.5, (ball.radius - ball.z * 0.03) * 0.55), 0, 0, Math.PI * 2);
    ctx.fill();

    const drawY = ball.y - ball.z;
    const drawR = ball.radius + ball.z * 0.045;
    const squashX = 1 + bounceSquash * 0.35;
    const squashY = 1 - bounceSquash * 0.25;
    ctx.fillStyle = '#d9f99d';
    ctx.beginPath();
    ctx.ellipse(ball.x, drawY, drawR * squashX, drawR * squashY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#141413';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    drawBroadcastScorebug();

    if (state.bannerText) {
      ctx.save();
      ctx.fillStyle = '#141413';
      ctx.fillRect(251, 271, 410, 84);
      ctx.fillStyle = '#f4efe6';
      ctx.fillRect(245, 265, 410, 84);
      ctx.strokeStyle = '#141413';
      ctx.lineWidth = 3;
      ctx.strokeRect(245, 265, 410, 84);

      ctx.fillStyle = '#141413';
      ctx.font = '900 32px "Barlow Condensed", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.bannerText, 450, 304);

      ctx.fillStyle = '#57534e';
      ctx.font = '700 13px "IBM Plex Mono", monospace';
      ctx.fillText(state.bannerSub, 450, 330);
      ctx.restore();
    }
  }

  function drawBroadcastScorebug() {
    ctx.save();
    ctx.fillStyle = '#141413';
    ctx.fillRect(75, 55, 172, 48);
    ctx.fillStyle = '#f4efe6';
    ctx.fillRect(72, 52, 172, 48);
    ctx.strokeStyle = '#141413';
    ctx.lineWidth = 2;
    ctx.strokeRect(72, 52, 172, 48);

    ctx.beginPath();
    ctx.moveTo(72, 76);
    ctx.lineTo(244, 76);
    ctx.stroke();

    ctx.fillStyle = '#1f4e79';
    ctx.fillRect(72, 52, 6, 24);
    ctx.fillStyle = '#141413';
    ctx.font = '800 14px "Barlow Condensed", Impact, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('YOU', 85, 69);
    if (state.server === 'player') {
      ctx.fillStyle = '#e09f1f';
      ctx.beginPath();
      ctx.arc(204, 64, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#141413';
    ctx.font = '700 13px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(state.playerScore), 234, 69);

    ctx.fillStyle = '#c84b31';
    ctx.fillRect(72, 76, 6, 24);
    ctx.fillStyle = '#141413';
    ctx.font = '800 14px "Barlow Condensed", Impact, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('S. WILLIAMS', 85, 93);
    if (state.server === 'serena') {
      ctx.fillStyle = '#e09f1f';
      ctx.beginPath();
      ctx.arc(204, 88, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#141413';
    ctx.font = '700 13px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(state.serenaScore), 234, 93);
    ctx.restore();
  }

  function drawAthlete(char, opts) {
    const dir = opts.isTop ? 1 : -1;
    const img = opts.isTop ? serenaImg : playerImg;
    const imgReady = opts.isTop ? serenaImgReady : playerImgReady;

    const spriteW = 90;
    const spriteH = 72;

    const swingProgress = char.swingTimer > 0
      ? 1 - (char.swingTimer / (char.swingDuration || 0.28))
      : 0;

    if (char.swingTimer > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.55)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      const startA = opts.isTop ? 0.15 * Math.PI : 1.15 * Math.PI;
      const endA = opts.isTop ? 0.85 * Math.PI : 1.85 * Math.PI;
      ctx.arc(char.x, char.y, 40, startA, endA);
      ctx.stroke();
      ctx.restore();
    }

    const racketBaseAngle = opts.isTop ? 0.35 * Math.PI : -0.35 * Math.PI;
    const racketSwingOffset = char.swingTimer > 0
      ? (opts.isTop ? 1 : -1) * (swingProgress - 0.5) * 2.1
      : 0;
    const racketAngle = racketBaseAngle + racketSwingOffset;

    ctx.save();
    ctx.translate(char.x + 16, char.y + dir * 3);

    if (racketImgReady) {
      ctx.rotate(racketAngle + 0.30 * Math.PI);
      const rw = 36;
      const rh = 48;
      ctx.drawImage(racketImg, 335, 225, 215, 290, -2, -rh + 2, rw, rh);
    } else {
      ctx.rotate(racketAngle);

      ctx.strokeStyle = opts.goldRacket ? '#fbbf24' : '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();

      ctx.strokeStyle = opts.goldRacket ? '#f59e0b' : '#f8fafc';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(22, 0, 9, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    if (imgReady) {

      const bob = Math.sin(char.stride) * 1.5;
      ctx.drawImage(img, char.x - spriteW / 2, char.y - spriteH / 2 + bob, spriteW, spriteH);
    } else {

      ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
      ctx.beginPath();
      ctx.ellipse(char.x, char.y + 13, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      const footOffset = Math.sin(char.stride) * 5;
      ctx.fillStyle = opts.goldShoes ? '#fbbf24' : '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(char.x - 7, char.y + 10 + footOffset, 4.5, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(char.x + 7, char.y + 10 - footOffset, 4.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = opts.jersey;
      ctx.beginPath();
      ctx.ellipse(char.x, char.y + 1, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = opts.trim;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = opts.skin;
      ctx.beginPath();
      ctx.arc(char.x, char.y - 2, 9.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = opts.hair;
      ctx.beginPath();
      ctx.arc(char.x, char.y - 4, 9.5, Math.PI, Math.PI * 2);
      ctx.fill();

      if (opts.hasVisor) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(char.x - 8, char.y - 6, 16, 3.5);
      } else if (opts.hasBand) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(char.x - 8, char.y - 6, 16, 3);
      }
    }

    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(char.x - 26, char.y + (opts.isTop ? -30 : 21), 52, 14);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(opts.label, char.x, char.y + (opts.isTop ? -20 : 31));
  }

  return {
    init,
    startMatch,
    stop,
    setPaused,
    isPaused: () => paused,
    isRunning: () => running
  };
})();
