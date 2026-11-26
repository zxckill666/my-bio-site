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

  // 00. Живой Discord профиль, рамка аватара, кастомный статус и RPC через Lanyard
  const DISCORD_USER_ID = '1378047204119547989';
  const discordCard = document.getElementById('discord-card');
  const dcAvatarEl = document.getElementById('dc-avatar');
  const dcDecorationEl = document.getElementById('dc-avatar-decoration');
  const dcStatusDotEl = document.getElementById('dc-status-dot');
  const dcUsernameEl = document.getElementById('dc-username');
  const dcHandleEl = document.getElementById('dc-handle');
  const dcStatusTextEl = document.getElementById('dc-status-text');
  const dcSummaryLineEl = document.getElementById('dc-summary-line');
  const dcCustomBoxEl = document.getElementById('dc-custom-box');
  const dcCustomEmojiEl = document.getElementById('dc-custom-emoji');
  const dcCustomTextEl = document.getElementById('dc-custom-text');
  const dcRpcImgEl = document.getElementById('dc-rpc-img');
  const dcRpcNameEl = document.getElementById('dc-rpc-name');
  const dcRpcDetailsEl = document.getElementById('dc-rpc-details');
  const dcRpcStateEl = document.getElementById('dc-rpc-state');
  const dcRpcElapsedEl = document.getElementById('dc-rpc-elapsed');

  let activeRpcStartMs = null;

  // 3D-наклон и радиальная подсветка за курсором на карточке Discord
  if (discordCard) {
    discordCard.addEventListener('mousemove', (e) => {
      const rect = discordCard.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const relX = px / rect.width - 0.5;
      const relY = py / rect.height - 0.5;

      discordCard.classList.add('is-tilting');
      discordCard.style.setProperty('--mx', `${px.toFixed(1)}px`);
      discordCard.style.setProperty('--my', `${py.toFixed(1)}px`);
      discordCard.style.setProperty('--dc-rx', `${(-relY * 9).toFixed(2)}deg`);
      discordCard.style.setProperty('--dc-ry', `${(relX * 9).toFixed(2)}deg`);
      discordCard.style.setProperty('--dc-ty', '-2px');
    });

    discordCard.addEventListener('mouseleave', () => {
      discordCard.classList.remove('is-tilting');
      discordCard.style.setProperty('--dc-rx', '0deg');
      discordCard.style.setProperty('--dc-ry', '0deg');
      discordCard.style.setProperty('--dc-ty', '0px');
    });
  }

  function resolveRpcAssetUrl(activity, discordUserId) {
    const assets = activity?.assets;
    const appId = activity?.application_id;
    const raw = assets?.large_image || assets?.small_image;
    if (!raw) return '';
    if (raw.startsWith('mp:external/')) {
      return `https://media.discordapp.net/external/${raw.replace('mp:external/', '')}`;
    }
    if (appId) {
      return `https://cdn.discordapp.com/app-assets/${appId}/${raw}.png`;
    }
    return `https://cdn.discordapp.com/avatars/${discordUserId}/${raw}.png`;
  }

  function formatElapsed(startMs) {
    if (!startMs) return '';
    const diffSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function renderLanyardPresence(data) {
    if (!data) return;

    const user = data.discord_user;
    if (user) {
      dcUsernameEl.textContent = user.global_name || user.username || 'sekailauren';
      dcHandleEl.textContent = user.username ? `@${user.username}` : '';

      if (user.avatar) {
        const isAnimatedAvatar = user.avatar.startsWith('a_');
        const ext = isAnimatedAvatar ? 'gif' : 'png';
        dcAvatarEl.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
      }

      // Рамка аватара из Discord (avatar_decoration_data)
      const decoAsset = user.avatar_decoration_data?.asset;
      if (decoAsset) {
        dcDecorationEl.src = `https://cdn.discordapp.com/avatar-decoration-presets/${decoAsset}.png?size=160&passthrough=true`;
        dcDecorationEl.classList.remove('hidden-icon');
      } else {
        dcDecorationEl.classList.add('hidden-icon');
      }
    }

    const status = data.discord_status || 'offline';
    dcStatusDotEl.className = `dc-status-dot ${status}`;
    dcStatusTextEl.className = `discord-status-badge ${status}`;
    dcStatusTextEl.textContent = status;

    const activities = Array.isArray(data.activities) ? data.activities : [];
    const customAct = activities.find((a) => a.type === 4);
    const rpcAct = activities.find((a) => a.type !== 4);

    // Кастомный статус для выезжающей панели при наведении
    const hasCustomText = Boolean(customAct && (customAct.state || customAct.emoji?.name));
    if (hasCustomText) {
      const emojiStr = customAct.emoji?.name && !customAct.emoji?.id ? customAct.emoji.name : '';
      dcCustomEmojiEl.textContent = emojiStr;
      dcCustomTextEl.textContent = customAct.state || '';
      dcCustomBoxEl.classList.remove('hidden-icon');
    } else {
      dcCustomBoxEl.classList.add('hidden-icon');
    }

    // Краткая строка в свернутом виде
    if (rpcAct) {
      dcSummaryLineEl.textContent = `Играет / активен: ${rpcAct.name}`;
    } else if (hasCustomText) {
      dcSummaryLineEl.textContent = 'Есть кастомный статус — наведи';
    } else {
      dcSummaryLineEl.textContent = 'Наведи, чтобы посмотреть RPC';
    }

    // RPC блок
    if (rpcAct) {
      dcRpcNameEl.textContent = rpcAct.name || 'Активность';
      dcRpcDetailsEl.textContent = rpcAct.details || '';
      dcRpcStateEl.textContent = rpcAct.state || '';
      activeRpcStartMs = rpcAct.timestamps?.start || null;
      dcRpcElapsedEl.textContent = activeRpcStartMs ? formatElapsed(activeRpcStartMs) : '';

      const imgUrl = resolveRpcAssetUrl(rpcAct, user?.id || DISCORD_USER_ID);
      if (imgUrl) {
        dcRpcImgEl.src = imgUrl;
        dcRpcImgEl.classList.remove('hidden-icon');
      } else {
        dcRpcImgEl.classList.add('hidden-icon');
      }
    } else {
      dcRpcNameEl.textContent = 'Нет активного RPC';
      dcRpcDetailsEl.textContent = 'Запусти игру, код или музыку в Discord';
      dcRpcStateEl.textContent = '';
      dcRpcElapsedEl.textContent = '';
      activeRpcStartMs = null;
      dcRpcImgEl.classList.add('hidden-icon');
    }
  }

  function initLanyard() {
    fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => {
        if (json?.success && json?.data) {
          renderLanyardPresence(json.data);
        }
      })
      .catch(() => {});

    let heartbeatId = null;
    const ws = new WebSocket('wss://api.lanyard.rest/socket');

    ws.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.op === 1 && payload.d?.heartbeat_interval) {
          ws.send(JSON.stringify({
            op: 2,
            d: { subscribe_to_id: DISCORD_USER_ID }
          }));
          clearInterval(heartbeatId);
          heartbeatId = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ op: 3 }));
            }
          }, payload.d.heartbeat_interval);
        } else if (payload.op === 0 && (payload.t === 'INIT_STATE' || payload.t === 'PRESENCE_UPDATE')) {
          renderLanyardPresence(payload.d);
        }
      } catch (_) {}
    });

    ws.addEventListener('close', () => {
      clearInterval(heartbeatId);
    });

    setInterval(() => {
      if (activeRpcStartMs) {
        dcRpcElapsedEl.textContent = formatElapsed(activeRpcStartMs);
      }
    }, 1000);
  }

  initLanyard();

  // 0. Уникальный счетчик просмотров с защитой от накрутки с одного IP / устройства
  const viewsCountEl = document.getElementById('views-count');
  const COUNTER_NAMESPACE = 'sekailauren_bio_unique_2026';
  const COUNTER_KEY = 'visits';
  const DEVICE_FLAG_KEY = 'sekailauren_device_counted_v1';
  const SEEN_IPS_KEY = 'sekailauren_seen_ips_v1';

  async function updateUniqueViewsCounter() {
    let visitorIp = '';
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        visitorIp = typeof ipData?.ip === 'string' ? ipData.ip.trim() : '';
      }
    } catch (_) {}

    let seenIps = [];
    try {
      seenIps = JSON.parse(localStorage.getItem(SEEN_IPS_KEY) || '[]');
      if (!Array.isArray(seenIps)) seenIps = [];
    } catch (_) {
      seenIps = [];
    }

    const alreadyCountedDevice = localStorage.getItem(DEVICE_FLAG_KEY) === '1';
    const alreadyCountedIp = Boolean(visitorIp && seenIps.includes(visitorIp));
    const shouldIncrement = !alreadyCountedDevice && !alreadyCountedIp;

    const endpointAction = shouldIncrement ? 'up' : 'get';

    try {
      const res = await fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}/${endpointAction}`, {
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('counter failed');
      const data = await res.json();
      const val = typeof data?.count === 'number'
        ? data.count
        : (typeof data?.value === 'number' ? data.value : 1);

      viewsCountEl.textContent = String(Math.max(1, val));

      if (shouldIncrement) {
        localStorage.setItem(DEVICE_FLAG_KEY, '1');
        if (visitorIp && !seenIps.includes(visitorIp)) {
          seenIps.push(visitorIp);
          localStorage.setItem(SEEN_IPS_KEY, JSON.stringify(seenIps.slice(-20)));
        }
      }
    } catch (_) {
      viewsCountEl.textContent = '1';
      localStorage.setItem(DEVICE_FLAG_KEY, '1');
    }
  }

  updateUniqueViewsCounter();

  // 1. Логика входа по клику на >my bio<
  const entryScreen = document.getElementById('entry-screen');
  const enterBtn = document.getElementById('enter-btn');
  const mainContent = document.getElementById('main-content');

  let audioCtx = null;
  let analyser = null;
  let freqData = null;

  function initAudioAnalyser() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaElementSource(audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      freqData = new Uint8Array(analyser.frequencyBinCount);
    } catch (_) {
      analyser = null;
    }
  }

  enterBtn.addEventListener('click', () => {
    entryScreen.classList.add('fade-out');
    mainContent.classList.remove('hidden');

    requestAnimationFrame(() => {
      mainContent.classList.add('revealed');
    });

    initAudioAnalyser();
    audio.play().catch(() => {});
  });

  // 2. Плавное перемещение проигрывателя по экрану с интерполяцией
  let isPlayerDragging = false;
  let playerDragOffsetX = 0;
  let playerDragOffsetY = 0;
  let targetPlayerX = null;
  let targetPlayerY = null;
  let currentPlayerX = null;
  let currentPlayerY = null;
  let playerPosInitialized = false;

  function clampPlayerPosition(x, y) {
    const rect = topPlayer.getBoundingClientRect();
    const margin = 10;
    const maxX = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxY = Math.max(margin, window.innerHeight - rect.height - margin);
    return {
      x: Math.max(margin, Math.min(x, maxX)),
      y: Math.max(margin, Math.min(y, maxY))
    };
  }

  function shouldIgnorePlayerDrag(target) {
    return Boolean(
      target.closest('button') ||
      target.closest('input') ||
      target.closest('.progress-track-wrap') ||
      target.closest('.volume-drawer')
    );
  }

  topPlayer.addEventListener('pointerdown', (e) => {
    if (shouldIgnorePlayerDrag(e.target)) return;
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;

    const rect = topPlayer.getBoundingClientRect();
    if (!playerPosInitialized) {
      currentPlayerX = rect.left;
      currentPlayerY = rect.top;
      targetPlayerX = rect.left;
      targetPlayerY = rect.top;
      playerPosInitialized = true;
    }

    isPlayerDragging = true;
    playerDragOffsetX = e.clientX - currentPlayerX;
    playerDragOffsetY = e.clientY - currentPlayerY;
    topPlayer.classList.add('dragging');
    topPlayer.setPointerCapture(e.pointerId);
  });

  topPlayer.addEventListener('pointermove', (e) => {
    if (!isPlayerDragging) return;
    const clamped = clampPlayerPosition(
      e.clientX - playerDragOffsetX,
      e.clientY - playerDragOffsetY
    );
    targetPlayerX = clamped.x;
    targetPlayerY = clamped.y;
  });

  function stopPlayerDrag(e) {
    if (!isPlayerDragging) return;
    isPlayerDragging = false;
    topPlayer.classList.remove('dragging');
    if (topPlayer.hasPointerCapture(e.pointerId)) {
      topPlayer.releasePointerCapture(e.pointerId);
    }
  }

  topPlayer.addEventListener('pointerup', stopPlayerDrag);
  topPlayer.addEventListener('pointercancel', stopPlayerDrag);

  window.addEventListener('resize', () => {
    if (!playerPosInitialized) return;
    const clamped = clampPlayerPosition(targetPlayerX, targetPlayerY);
    targetPlayerX = clamped.x;
    targetPlayerY = clamped.y;
  });

  // 3. CAVA-полоски рядом с названием трека
  const cavaCanvas = document.getElementById('cava-canvas');
  const cavaCtx = cavaCanvas.getContext('2d');
  const CAVA_BARS = 8;
  const cavaLevels = new Array(CAVA_BARS).fill(0.15);

  function renderCavaBars(timeMs) {
    const w = cavaCanvas.width;
    const h = cavaCanvas.height;
    cavaCtx.clearRect(0, 0, w, h);

    const isPlaying = !audio.paused && !audio.muted && audio.volume > 0.01;
    let hasRealAudio = false;

    if (analyser && freqData && isPlaying) {
      analyser.getByteFrequencyData(freqData);
      for (let i = 0; i < freqData.length; i++) {
        if (freqData[i] > 6) {
          hasRealAudio = true;
          break;
        }
      }
    }

    const gap = 2;
    const barWidth = Math.max(2, (w - gap * (CAVA_BARS - 1)) / CAVA_BARS);

    for (let i = 0; i < CAVA_BARS; i++) {
      let targetLevel = 0.14;

      if (isPlaying) {
        if (hasRealAudio && freqData) {
          const binIndex = Math.min(freqData.length - 1, Math.floor((i / CAVA_BARS) * 18) + 1);
          targetLevel = Math.max(0.16, Math.min(1, (freqData[binIndex] / 255) * 1.25));
        } else {
          const wave1 = Math.sin(timeMs * 0.0085 + i * 0.75) * 0.5 + 0.5;
          const wave2 = Math.cos(timeMs * 0.013 - i * 1.1) * 0.5 + 0.5;
          targetLevel = Math.max(0.18, Math.min(0.96, wave1 * 0.62 + wave2 * 0.34));
        }
      }

      cavaLevels[i] += (targetLevel - cavaLevels[i]) * (isPlaying ? 0.26 : 0.14);

      const barHeight = Math.max(3, cavaLevels[i] * (h - 2));
      const x = i * (barWidth + gap);
      const y = h - barHeight;

      const grad = cavaCtx.createLinearGradient(0, y, 0, h);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.55, '#818cf8');
      grad.addColorStop(1, '#f472b6');

      cavaCtx.fillStyle = grad;
      cavaCtx.beginPath();
      cavaCtx.roundRect(x, y, barWidth, barHeight, 2);
      cavaCtx.fill();
    }
  }

  // 4. Логика проигрывателя и громкости
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
    initAudioAnalyser();
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

  // 5. Плавное перетаскивание ползунка трека
  let isScrubbing = false;

  function setSeekFromClientX(clientX, immediateVisual = false) {
    const rect = seekSlider.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    const pct = Math.max(0, Math.min(100, ratio * 100));
    targetProgressPercent = pct;
    if (immediateVisual) {
      smoothProgressPercent = pct;
      progressFill.style.width = `${pct.toFixed(3)}%`;
    }
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
    smoothProgressPercent = pct;
    progressFill.style.width = `${pct.toFixed(3)}%`;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (pct / 100) * audio.duration;
      currentTimeEl.textContent = formatTime(audio.currentTime);
    }
  });

  seekSlider.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    isScrubbing = true;
    progressTrackWrap.classList.add('scrubbing');
    seekSlider.setPointerCapture(e.pointerId);
    setSeekFromClientX(e.clientX, true);
    spawnProgressParticles(7, true);
  });

  seekSlider.addEventListener('pointermove', (e) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    setSeekFromClientX(e.clientX, true);
    spawnProgressParticles(6, true);
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

  // 6. 3D-наклон полупрозрачных кнопок за курсором мыши
  const tiltButtons = document.querySelectorAll('.tilt-btn');
  tiltButtons.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      const rotateY = relX * 14;
      const rotateX = -relY * 14;

      btn.classList.add('is-tilting');
      btn.style.setProperty('--rx', `${rotateX.toFixed(2)}deg`);
      btn.style.setProperty('--ry', `${rotateY.toFixed(2)}deg`);
      btn.style.setProperty('--ty', '-3px');
    });

    btn.addEventListener('mouseleave', () => {
      btn.classList.remove('is-tilting');
      btn.style.setProperty('--rx', '0deg');
      btn.style.setProperty('--ry', '0deg');
      btn.style.setProperty('--ty', '0px');
    });
  });

  // 7. Частицы у ползунка прогресса и громкости (включая чёрные частицы)
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

  const particlePalette = [
    { color: '#09090b', isBlack: true },
    { color: '#111114', isBlack: true },
    { color: '#38bdf8', isBlack: false },
    { color: '#818cf8', isBlack: false },
    { color: '#f472b6', isBlack: false },
    { color: '#ffffff', isBlack: false }
  ];

  function spawnProgressParticles(count = 1, boosting = false) {
    const rect = pCanvas.getBoundingClientRect();
    if (rect.width <= 0) return;

    const insetPad = 10;
    const usableWidth = Math.max(1, rect.width - insetPad * 2);
    const thumbX = insetPad + usableWidth * (smoothProgressPercent / 100);
    const centerY = rect.height / 2;

    for (let i = 0; i < count; i++) {
      const pickBlack = Math.random() < 0.45;
      const chosen = pickBlack
        ? particlePalette[Math.random() < 0.5 ? 0 : 1]
        : particlePalette[2 + Math.floor(Math.random() * 4)];

      const spread = boosting ? 12 : 6;
      const angle = Math.random() * Math.PI * 2;
      const speed = boosting ? (Math.random() * 1.1 + 0.35) : (Math.random() * 0.45 + 0.12);

      barParticles.push({
        x: thumbX + (Math.random() - 0.5) * spread,
        y: centerY + (Math.random() - 0.5) * (boosting ? 9 : 5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (boosting ? 0.25 : 0.15),
        size: chosen.isBlack ? (Math.random() * 2.1 + 1.35) : (Math.random() * 2.1 + 1.0),
        alpha: 0.98,
        decay: boosting ? (Math.random() * 0.02 + 0.015) : (Math.random() * 0.024 + 0.018),
        color: chosen.color,
        isBlack: chosen.isBlack
      });
    }
  }

  function spawnVolumeBurst(count = 2) {
    const rect = vCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const xPos = ((rect.width - 18) * (smoothVolumePercent / 100)) + 9;
    const yPos = rect.height / 2;

    for (let i = 0; i < count; i++) {
      const isBlack = Math.random() < 0.42;
      const color = isBlack
        ? '#09090b'
        : particlePalette[2 + Math.floor(Math.random() * 4)].color;

      volParticles.push({
        x: xPos + (Math.random() - 0.5) * 6,
        y: yPos + (Math.random() - 0.5) * 5,
        vx: (Math.random() - 0.5) * 0.85,
        vy: (Math.random() - 0.5) * 0.9 - 0.2,
        size: isBlack ? (Math.random() * 1.8 + 1.2) : (Math.random() * 1.8 + 0.9),
        alpha: 0.96,
        decay: Math.random() * 0.026 + 0.018,
        color,
        isBlack
      });
    }
  }

  function drawParticleItem(ctxTarget, pt) {
    ctxTarget.save();
    ctxTarget.globalAlpha = Math.max(0, pt.alpha);
    ctxTarget.fillStyle = pt.color;
    if (pt.isBlack) {
      ctxTarget.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctxTarget.lineWidth = 0.75;
    } else {
      ctxTarget.shadowBlur = 6;
      ctxTarget.shadowColor = pt.color;
    }
    ctxTarget.beginPath();
    ctxTarget.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctxTarget.fill();
    if (pt.isBlack) {
      ctxTarget.stroke();
    }
    ctxTarget.restore();
  }

  function renderSlidersAndParticles(timeMs = 0) {
    if (playerPosInitialized) {
      const posFactor = isPlayerDragging ? 0.36 : 0.16;
      currentPlayerX += (targetPlayerX - currentPlayerX) * posFactor;
      currentPlayerY += (targetPlayerY - currentPlayerY) * posFactor;
      topPlayer.style.position = 'fixed';
      topPlayer.style.left = `${currentPlayerX.toFixed(2)}px`;
      topPlayer.style.top = `${currentPlayerY.toFixed(2)}px`;
      topPlayer.style.margin = '0';
    }

    renderCavaBars(timeMs);

    const progFactor = isScrubbing ? 0.65 : 0.18;
    smoothProgressPercent += (targetProgressPercent - smoothProgressPercent) * progFactor;
    progressFill.style.width = `${smoothProgressPercent.toFixed(3)}%`;

    const volFactor = isVolumeDragging ? 0.35 : 0.15;
    smoothVolumePercent += (targetVolumePercent - smoothVolumePercent) * volFactor;
    volumeFill.style.width = `${smoothVolumePercent.toFixed(3)}%`;
    volumeThumb.style.left = `${smoothVolumePercent.toFixed(3)}%`;

    const pRect = pCanvas.getBoundingClientRect();
    pCtx.clearRect(0, 0, pRect.width, pRect.height);

    if (isScrubbing) {
      spawnProgressParticles(3, true);
    } else if (!audio.paused || progressTrackWrap.matches(':hover')) {
      if (Math.random() < 0.75) {
        spawnProgressParticles(1, false);
      }
    }

    for (let i = barParticles.length - 1; i >= 0; i--) {
      const pt = barParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= pt.decay;

      if (pt.alpha <= 0) {
        barParticles.splice(i, 1);
      } else {
        drawParticleItem(pCtx, pt);
      }
    }

    const vRect = vCanvas.getBoundingClientRect();
    vCtx.clearRect(0, 0, vRect.width, vRect.height);

    if (volumeControl.classList.contains('open') && (isVolumeDragging || Math.random() < 0.35)) {
      spawnVolumeBurst(isVolumeDragging ? 2 : 1);
    }

    for (let i = volParticles.length - 1; i >= 0; i--) {
      const vp = volParticles[i];
      vp.x += vp.vx;
      vp.y += vp.vy;
      vp.alpha -= vp.decay;

      if (vp.alpha <= 0) {
        volParticles.splice(i, 1);
      } else {
        drawParticleItem(vCtx, vp);
      }
    }

    requestAnimationFrame(renderSlidersAndParticles);
  }

  requestAnimationFrame(renderSlidersAndParticles);

  // 8. Анимация снежинок на фоне (увеличено количество) и за курсором
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
  const AMBIENT_COUNT = 95;

  for (let i = 0; i < AMBIENT_COUNT; i++) {
    ambientSnow.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.4 + 0.8,
      speedY: Math.random() * 0.9 + 0.35,
      speedX: (Math.random() - 0.5) * 0.45,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: Math.random() * 0.02 + 0.008,
      opacity: Math.random() * 0.5 + 0.16
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
      f.swayPhase += f.swaySpeed;
      f.y += f.speedY;
      f.x += f.speedX + Math.sin(f.swayPhase) * 0.25;

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