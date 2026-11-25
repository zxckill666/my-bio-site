document.addEventListener('DOMContentLoaded', () => {
  // 1. Логика входа по клику на >my bio<
  const entryScreen = document.getElementById('entry-screen');
  const enterBtn = document.getElementById('enter-btn');
  const mainContent = document.getElementById('main-content');

  enterBtn.addEventListener('click', () => {
    entryScreen.classList.add('fade-out');
    mainContent.classList.remove('hidden');

    // Небольшая задержка для плавного запуска 3D-переворота карточек
    requestAnimationFrame(() => {
      mainContent.classList.add('revealed');
    });
  });

  // 2. Анимация снежинок на фоне и шлейф за курсором
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

  // Создаем фоновые падающие снежинки
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

  // Генерация снежинок при движении мыши или пальца
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

  // Отрисовка снежинки (мягкий светящийся кристаллик)
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

    // Обновляем фоновый снег
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

    // Обновляем снежинки за курсором
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