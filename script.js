// Настройки твоего трека (поменяй название и файлы под свой MP3)
const TRACK_CONFIG = {
  title: 'The Beginning',
  audioSrc: 'track.mp3',
  coverSrc: 'cover.jpg' // можно заменить на 'cover.jpg' и закинуть картинку в папку
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Логика входа по клику на >my bio<
  const entryScreen = document.getElementById('entry-screen');
  const enterBtn = document.getElementById('enter-btn');
  const mainContent = document.getElementById('main-content');
  const audio = document.getElementById('audio-element');

  enterBtn.addEventListener('click', () => {
    entryScreen.classList.add('fade-out');
    mainContent.classList.remove('hidden');

    requestAnimationFrame(() => {
      mainContent.classList.add('revealed');
    });

    // Автозапуск трека после клика по >my bio< (браузеры разрешают звук после действия пользователя)
    audio.play().catch(() => {
      // Если track.mp3 еще не добавлен или браузер заблокировал — просто оставим на паузе
    });
  });

  // 2. Логика плеера: воспроизведение, перемотка, громкость, авто-сжатие и перетаскивание
  const player = document.getElementById('mini-player');
  const playerTitle = document.getElementById('player-title');
  const playerCover = document.getElementById('player-cover');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');
  const seekSlider = document.getElementById('seek-slider');
  const volumeSlider = document.getElementById('volume-slider');
  const currentTimeEl = document.getElementById('current-time');
  const durationTimeEl = document.getElementById('duration-time');

  playerTitle.textContent = TRACK_CONFIG.title;
  audio.src = TRACK_CONFIG.audioSrc;
  playerCover.src = TRACK_CONFIG.coverSrc;
  audio.volume = parseFloat(volumeSlider.value);

  let shrinkTimer = null;

  function expandPlayer() {
    clearTimeout(shrinkTimer);
    player.classList.add('expanded');
  }

  function scheduleShrinkPlayer() {
    clearTimeout(shrinkTimer);
    shrinkTimer = setTimeout(() => {
      if (!player.classList.contains('dragging')) {
        player.classList.remove('expanded');
      }
    }, 5000); // Ровно 5 секунд после ухода курсора
  }

  player.addEventListener('mouseenter', expandPlayer);
  player.addEventListener('mouseleave', scheduleShrinkPlayer);

  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '00:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updatePlayIcon() {
    if (audio.paused) {
      iconPlay.classList.remove('hidden-icon');
      iconPause.classList.add('hidden-icon');
    } else {
      iconPlay.classList.add('hidden-icon');
      iconPause.classList.remove('hidden-icon');
    }
  }

  playPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  });

  audio.addEventListener('play', updatePlayIcon);
  audio.addEventListener('pause', updatePlayIcon);
  audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  });

  audio.addEventListener('loadedmetadata', () => {
    seekSlider.max = audio.duration || 100;
    durationTimeEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('timeupdate', () => {
    if (!seekSlider.matches(':active')) {
      seekSlider.value = audio.currentTime || 0;
    }
    currentTimeEl.textContent = formatTime(audio.currentTime);
    if (Number.isFinite(audio.duration)) {
      durationTimeEl.textContent = formatTime(audio.duration);
    }
  });

  seekSlider.addEventListener('input', () => {
    audio.currentTime = parseFloat(seekSlider.value);
    currentTimeEl.textContent = formatTime(audio.currentTime);
  });

  // Не даем перетаскивать сам плеер при движении ползунков и кнопок
  [seekSlider, volumeSlider, playPauseBtn].forEach((el) => {
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
  });

  volumeSlider.addEventListener('input', () => {
    audio.volume = parseFloat(volumeSlider.value);
  });

  // Перетаскивание плеера по всему экрану (мышь + тач)
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  player.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;

    isDragging = true;
    player.classList.add('dragging');
    expandPlayer();

    const rect = player.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    // Переводим в координаты left/top, чтобы можно было двигать в любой угол
    player.style.left = `${rect.left}px`;
    player.style.top = `${rect.top}px`;
    player.style.right = 'auto';
    player.style.bottom = 'auto';

    player.setPointerCapture(e.pointerId);
  });

  player.addEventListener('pointermove', (e) => {
    if (!isDragging) return;

    const rect = player.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;

    let nextX = e.clientX - offsetX;
    let nextY = e.clientY - offsetY;

    nextX = Math.max(8, Math.min(nextX, Math.max(8, maxX)));
    nextY = Math.max(8, Math.min(nextY, Math.max(8, maxY)));

    player.style.left = `${nextX}px`;
    player.style.top = `${nextY}px`;
  });

  function stopDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    player.classList.remove('dragging');
    if (player.hasPointerCapture(e.pointerId)) {
      player.releasePointerCapture(e.pointerId);
    }
    scheduleShrinkPlayer();
  }

  player.addEventListener('pointerup', stopDrag);
  player.addEventListener('pointercancel', stopDrag);

  // 3. Анимация снежинок на фоне и шлейф за курсором
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