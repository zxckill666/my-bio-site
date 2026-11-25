document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('audio-element');
  const topPlayer = document.getElementById('top-player');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const muteBtn = document.getElementById('mute-btn');
  const volumeControl = document.getElementById('volume-control');
  const volumeSlider = document.getElementById('volume-slider');
  const volumeFill = document.getElementById('volume-fill');
  const volumeThumb = document.getElementById('volume-thumb');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');
  const iconSoundOn = document.getElementById('icon-sound-on');
  const iconSoundOff = document.getElementById('icon-sound-off');
  const progressTrackWrap = document.getElementById('progress-track-wrap');
  const seekSlider = document.getElementById('seek-slider');
  const progressFill = document.getElementById('progress-fill');
  const currentTimeEl = document.getElementById('current-time');
  const durationTimeEl = document.getElementById('duration-time');

  let lastNonZeroVolume = parseFloat(volumeSlider.value) || 0.75;
  audio.volume = lastNonZeroVolume;

  // 1. Логика входа по клику на >my bio<
  const entryScreen = document.getElementById('entry-screen');
  const enterBtn = document.getElementById('enter-btn');
  const mainContent = document.getElementById('main-content');

  enterBtn.addEventListener('click', () => {
    entryScreen.classList.add('fade-out');
    mainContent.classList.remove('hidden');

    requestAnimationFrame(() => {
      mainContent.classList.add('revealed');
    });

    audio.play().catch(() => {});
  });

  // 2. Логика проигрывателя и громкости
  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '00:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function syncPlayState() {
    if (audio.paused) {
      topPlayer.classList.remove('playing');
      iconPlay.classList.remove('hidden-icon');
      iconPause.classList.add('hidden-icon');
    } else {
      topPlayer.classList.add('playing');
      iconPlay.classList.add('hidden-icon');
      iconPause.classList.remove('hidden-icon');
    }
  }

  function syncMuteState() {
    const isMutedNow = audio.muted || audio.volume <= 0.02;
    if (isMutedNow) {
      iconSoundOn.classList.add('hidden-icon');
      iconSoundOff.classList.remove('hidden-icon');
    } else {
      iconSoundOn.classList.remove('hidden-icon');
      iconSoundOff.classList.add('hidden-icon');
    }
  }

  function syncVolumeUI(val) {
    const clamped = Math.max(0, Math.min(1, val));
    const pct = clamped * 100;
    volumeFill.style.width = `${pct}%`;
    volumeThumb.style.left = `${pct}%`;
    volumeSlider.value = clamped;

    // Если опустили ползунок в самый низ (<= 0.03) — вырубаем звук полностью
    if (clamped <= 0.03) {
      audio.volume = 0;
      audio.muted = true;
    } else {
      audio.muted = false;
      audio.volume = clamped;
      lastNonZeroVolume = clamped;
    }
    syncMuteState();
  }

  syncVolumeUI(lastNonZeroVolume);

  // Плавное открытие/закрытие ползунка громкости при наведении
  let volumeCloseTimer = null;

  function openVolumeDrawer() {
    clearTimeout(volumeCloseTimer);
    volumeControl.classList.add('open');
  }

  function scheduleCloseVolumeDrawer() {
    clearTimeout(volumeCloseTimer);
    volumeCloseTimer = setTimeout(() => {
      if (!volumeSlider.matches(':active')) {
        volumeControl.classList.remove('open');
      }
    }, 320);
  }

  volumeControl.addEventListener('mouseenter', openVolumeDrawer);
  volumeControl.addEventListener('mouseleave', scheduleCloseVolumeDrawer);
  volumeSlider.addEventListener('pointerup', scheduleCloseVolumeDrawer);

  playPauseBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  });

  muteBtn.addEventListener('click', () => {
    if (audio.muted || audio.volume <= 0.03) {
      const restoreVal = lastNonZeroVolume > 0.05 ? lastNonZeroVolume : 0.7;
      syncVolumeUI(restoreVal);
    } else {
      lastNonZeroVolume = audio.volume;
      syncVolumeUI(0);
    }
  });

  volumeSlider.addEventListener('input', () => {
    openVolumeDrawer();
    syncVolumeUI(parseFloat(volumeSlider.value));
  });

  audio.addEventListener('play', syncPlayState);
  audio.addEventListener('pause', syncPlayState);
  audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    updateProgressUI(0);
    syncPlayState();
  });

  audio.addEventListener('loadedmetadata', () => {
    durationTimeEl.textContent = formatTime(audio.duration);
  });

  // 3. Плавный драг перемотки трека
  let isScrubbing = false;

  function updateProgressUI(percent) {
    const clamped = Math.max(0, Math.min(100, percent));
    progressFill.style.width = `${clamped}%`;
    seekSlider.value = clamped;
  }

  function setSeekFromClientX(clientX) {
    const rect = seekSlider.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    const pct = Math.max(0, Math.min(100, ratio * 100));
    updateProgressUI(pct);

    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      const targetTime = (pct / 100) * audio.duration;
      audio.currentTime = targetTime;
      currentTimeEl.textContent = formatTime(targetTime);
    }
  }

  audio.addEventListener('timeupdate', () => {
    if (isScrubbing) return;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      durationTimeEl.textContent = formatTime(audio.duration);
      updateProgressUI((audio.currentTime / audio.duration) * 100);
    }
  });

  seekSlider.addEventListener('input', () => {
    const pct = parseFloat(seekSlider.value);
    updateProgressUI(pct);
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (pct / 100) * audio.duration;
      currentTimeEl.textContent = formatTime(audio.currentTime);
    }
  });

  seekSlider.addEventListener('pointerdown', (e) => {
    isScrubbing = true;
    progressTrackWrap.classList.add('scrubbing');
    seekSlider.setPointerCapture(e.pointerId);
    setSeekFromClientX(e.clientX);
  });

  seekSlider.addEventListener('pointermove', (e) => {
    if (!isScrubbing) return;
    setSeekFromClientX(e.clientX);
    for (let i = 0; i < 2; i++) {
      spawnProgressParticle();
    }
  });

  function endScrub(e) {
    if (!isScrubbing) return;
    isScrubbing = false;
    progressTrackWrap.classList.remove('scrubbing');
    if (seekSlider.hasPointerCapture(e.pointerId)) {
      seekSlider.releasePointerCapture(e.pointerId);
    }
  }

  seekSlider.addEventListener('pointerup', endScrub);
  seekSlider.addEventListener('pointercancel', endScrub);

  // 4. Частички вдоль ползунка прогресса песни
  const pCanvas = document.getElementById('progress-particles');
  const pCtx = pCanvas.getContext('2d');
  const barParticles = [];

  function resizeBarCanvas() {
    const rect = pCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    pCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
    pCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
    pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resizeBarCanvas();
  window.addEventListener('resize', resizeBarCanvas);

  const particleColors = ['#38bdf8', '#818cf8', '#f472b6', '#ffffff'];

  function spawnProgressParticle() {
    const rect = pCanvas.getBoundingClientRect();
    const pct = parseFloat(seekSlider.value) || 0;
    const thumbX = ((rect.width - 12) * (pct / 100)) + 6;
    const centerY = rect.height / 2;

    barParticles.push({
      x: thumbX + (Math.random() - 0.5) * 6,
      y: centerY + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.85) * 1.1,
      vy: (Math.random() - 0.5) * 1.3 - 0.25,
      size: Math.random() * 2.2 + 1,
      alpha: 0.95,
      decay: Math.random() * 0.025 + 0.02,
      color: particleColors[Math.floor(Math.random() * particleColors.length)]
    });
  }

  function renderBarParticles() {
    const rect = pCanvas.getBoundingClientRect();
    pCtx.clearRect(0, 0, rect.width, rect.height);

    const isActive = !audio.paused || isScrubbing || progressTrackWrap.matches(':hover');
    if (isActive && Math.random() < 0.72) {
      spawnProgressParticle();
    }

    for (let i = barParticles.length - 1; i >= 0; i--) {
      const pt = barParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= pt.decay;

      if (pt.alpha <= 0) {
        barParticles.splice(i, 1);
      } else {
        pCtx.save();
        pCtx.globalAlpha = Math.max(0, pt.alpha);
        pCtx.fillStyle = pt.color;
        pCtx.shadowBlur = 6;
        pCtx.shadowColor = pt.color;
        pCtx.beginPath();
        pCtx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        pCtx.fill();
        pCtx.restore();
      }
    }

    requestAnimationFrame(renderBarParticles);
  }

  renderBarParticles();

  // 5. Анимация снежинок на фоне и за курсором
  const canvas = document.getElementById('snow-canvas');
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const ambientSnow = [];
  const cursorSnow = [];
  const AMBIENT_COUNT = 55;

  for (let i = 0; i < AMBIENT_COUNT; i++) {
    ambientSnow.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.2 + 0.8,
      speedY: Math.random() * 0.8 + 0.3,
      speedX: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.45 + 0.15
    });
  }

  function spawnCursorFlakes(x, y) {
    for (let i = 0; i < 2; i++) {
      cursorSnow.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 14,
        radius: Math.random() * 2.6 + 1.2,
        speedX: (Math.random() - 0.5) * 1.4,
        speedY: Math.random() * 1.2 + 0.5,
        opacity: 0.95,
        decay: Math.random() * 0.015 + 0.012
      });
    }
  }

  window.addEventListener('mousemove', (e) => {
    spawnCursorFlakes(e.clientX, e.clientY);
  });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      spawnCursorFlakes(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  function drawFlake(x, y, radius, opacity) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < ambientSnow.length; i++) {
      const f = ambientSnow[i];
      f.y += f.speedY;
      f.x += f.speedX;

      if (f.y > height) {
        f.y = -5;
        f.x = Math.random() * width;
      }
      if (f.x > width) f.x = 0;
      if (f.x < 0) f.x = width;

      drawFlake(f.x, f.y, f.radius, f.opacity);
    }

    for (let i = cursorSnow.length - 1; i >= 0; i--) {
      const p = cursorSnow[i];
      p.x += p.speedX;
      p.y += p.speedY;
      p.opacity -= p.decay;

      if (p.opacity <= 0) {
        cursorSnow.splice(i, 1);
      } else {
        drawFlake(p.x, p.y, p.radius, p.opacity);
      }
    }

    requestAnimationFrame(animate);
  }

  animate();
});