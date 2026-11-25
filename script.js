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
  let targetVolumePercent = lastNonZeroVolume * 100;
  let smoothVolumePercent = targetVolumePercent;

  let targetProgressPercent = 0;
  let smoothProgressPercent = 0;

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
    const isMutedNow = audio.muted || audio.volume <= 0.025;
    if (isMutedNow) {
      iconSoundOn.classList.add('hidden-icon');
      iconSoundOff.classList.remove('hidden-icon');
    } else {
      iconSoundOn.classList.remove('hidden-icon');
      iconSoundOff.classList.add('hidden-icon');
    }
  }

  function applyVolumeValue(val) {
    const clamped = Math.max(0, Math.min(1, val));
    targetVolumePercent = clamped * 100;
    volumeSlider.value = clamped;

    if (clamped <= 0.025) {
      audio.volume = 0;
      audio.muted = true;
    } else {
      audio.muted = false;
      audio.volume = clamped;
      lastNonZeroVolume = clamped;
    }
    syncMuteState();
    spawnVolumeBurst(3);
  }

  // Плавное открытие/закрытие ползунка громкости вниз при наведении
  let volumeCloseTimer = null;

  function openVolumeDrawer() {
    clearTimeout(volumeCloseTimer);
    volumeControl.classList.add('open');
    resizeVolCanvas();
  }

  function scheduleCloseVolumeDrawer() {
    clearTimeout(volumeCloseTimer);
    volumeCloseTimer = setTimeout(() => {
      if (!isVolumeDragging) {
        volumeControl.classList.remove('open');
      }
    }, 340);
  }

  volumeControl.addEventListener('mouseenter', openVolumeDrawer);
  volumeControl.addEventListener('mouseleave', scheduleCloseVolumeDrawer);

  playPauseBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  });

  muteBtn.addEventListener('click', () => {
    openVolumeDrawer();
    if (audio.muted || audio.volume <= 0.025) {
      const restoreVal = lastNonZeroVolume > 0.05 ? lastNonZeroVolume : 0.75;
      applyVolumeValue(restoreVal);
    } else {
      lastNonZeroVolume = audio.volume;
      applyVolumeValue(0);
    }
  });

  let isVolumeDragging = false;

  function setVolumeFromClientX(clientX) {
    const rect = volumeSlider.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    applyVolumeValue(ratio);
  }

  volumeSlider.addEventListener('input', () => {
    openVolumeDrawer();
    applyVolumeValue(parseFloat(volumeSlider.value));
  });

  volumeSlider.addEventListener('pointerdown', (e) => {
    isVolumeDragging = true;
    openVolumeDrawer();
    volumeSlider.setPointerCapture(e.pointerId);
    setVolumeFromClientX(e.clientX);
  });

  volumeSlider.addEventListener('pointermove', (e) => {
    if (!isVolumeDragging) return;
    setVolumeFromClientX(e.clientX);
    spawnVolumeBurst(2);
  });

  function stopVolumeDrag(e) {
    if (!isVolumeDragging) return;
    isVolumeDragging = false;
    if (volumeSlider.hasPointerCapture(e.pointerId)) {
      volumeSlider.releasePointerCapture(e.pointerId);
    }
    scheduleCloseVolumeDrawer();
  }

  volumeSlider.addEventListener('pointerup', stopVolumeDrag);
  volumeSlider.addEventListener('pointercancel', stopVolumeDrag);

  audio.addEventListener('play', syncPlayState);
  audio.addEventListener('pause', syncPlayState);
  audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    targetProgressPercent = 0;
    syncPlayState();
  });

  audio.addEventListener('loadedmetadata', () => {
    durationTimeEl.textContent = formatTime(audio.duration);
  });

  // 3. Сверхплавный драг перемотки трека
  let isScrubbing = false;

  function setSeekFromClientX(clientX) {
    const rect = seekSlider.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    const pct = Math.max(0, Math.min(100, ratio * 100));
    targetProgressPercent = pct;
    seekSlider.value = pct;

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
      targetProgressPercent = (audio.currentTime / audio.duration) * 100;
      seekSlider.value = targetProgressPercent;
    }
  });

  seekSlider.addEventListener('input', () => {
    const pct = parseFloat(seekSlider.value);
    targetProgressPercent = pct;
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
    for (let i = 0; i < 4; i++) {
      spawnProgressParticle();
    }
  });

  seekSlider.addEventListener('pointermove', (e) => {
    if (!isScrubbing) return;
    setSeekFromClientX(e.clientX);
    for (let i = 0; i < 3; i++) {
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

  // 4. Частички вдоль ползунка прогресса и ползунка громкости
  const pCanvas = document.getElementById('progress-particles');
  const pCtx = pCanvas.getContext('2d');
  const barParticles = [];

  const vCanvas = document.getElementById('volume-particles');
  const vCtx = vCanvas.getContext('2d');
  const volParticles = [];

  function resizeBarCanvas() {
    const rect = pCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    pCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
    pCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
    pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resizeVolCanvas() {
    const rect = vCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    vCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
    vCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
    vCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resizeBarCanvas();
  resizeVolCanvas();
  window.addEventListener('resize', () => {
    resizeBarCanvas();
    resizeVolCanvas();
  });

  const particleColors = ['#38bdf8', '#818cf8', '#f472b6', '#ffffff'];

  function spawnProgressParticle() {
    const rect = pCanvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const thumbX = ((rect.width - 14) * (smoothProgressPercent / 100)) + 7;
    const centerY = rect.height / 2;

    barParticles.push({
      x: thumbX + (Math.random() - 0.5) * 6,
      y: centerY + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.85) * 1.15,
      vy: (Math.random() - 0.5) * 1.4 - 0.25,
      size: Math.random() * 2.2 + 1,
      alpha: 0.95,
      decay: Math.random() * 0.022 + 0.018,
      color: particleColors[Math.floor(Math.random() * particleColors.length)]
    });
  }

  function spawnVolumeBurst(count = 2) {
    const rect = vCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const xPos = ((rect.width - 18) * (smoothVolumePercent / 100)) + 9;
    const yPos = rect.height / 2;

    for (let i = 0; i < count; i++) {
      volParticles.push({
        x: xPos + (Math.random() - 0.5) * 5,
        y: yPos + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 1.1,
        vy: -Math.random() * 1.2 - 0.3,
        size: Math.random() * 1.9 + 0.9,
        alpha: 0.95,
        decay: Math.random() * 0.028 + 0.02,
        color: particleColors[Math.floor(Math.random() * particleColors.length)]
      });
    }
  }

  function renderSlidersAndParticles() {
    // Сверхплавная интерполяция прогресса
    const progFactor = isScrubbing ? 0.42 : 0.16;
    smoothProgressPercent += (targetProgressPercent - smoothProgressPercent) * progFactor;
    progressFill.style.width = `${smoothProgressPercent.toFixed(3)}%`;

    // Сверхплавная интерполяция громкости
    const volFactor = isVolumeDragging ? 0.32 : 0.14;
    smoothVolumePercent += (targetVolumePercent - smoothVolumePercent) * volFactor;
    volumeFill.style.width = `${smoothVolumePercent.toFixed(3)}%`;
    volumeThumb.style.left = `${smoothVolumePercent.toFixed(3)}%`;

    // Частицы прогресса
    const pRect = pCanvas.getBoundingClientRect();
    pCtx.clearRect(0, 0, pRect.width, pRect.height);

    const progActive = !audio.paused || isScrubbing || progressTrackWrap.matches(':hover');
    if (progActive && Math.random() < 0.75) {
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

    // Частицы громкости
    const vRect = vCanvas.getBoundingClientRect();
    vCtx.clearRect(0, 0, vRect.width, vRect.height);

    if (volumeControl.classList.contains('open') && (isVolumeDragging || Math.random() < 0.35)) {
      spawnVolumeBurst(1);
    }

    for (let i = volParticles.length - 1; i >= 0; i--) {
      const vp = volParticles[i];
      vp.x += vp.vx;
      vp.y += vp.vy;
      vp.alpha -= vp.decay;

      if (vp.alpha <= 0) {
        volParticles.splice(i, 1);
      } else {
        vCtx.save();
        vCtx.globalAlpha = Math.max(0, vp.alpha);
        vCtx.fillStyle = vp.color;
        vCtx.shadowBlur = 5;
        vCtx.shadowColor = vp.color;
        vCtx.beginPath();
        vCtx.arc(vp.x, vp.y, vp.size, 0, Math.PI * 2);
        vCtx.fill();
        vCtx.restore();
      }
    }

    requestAnimationFrame(renderSlidersAndParticles);
  }

  renderSlidersAndParticles();

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