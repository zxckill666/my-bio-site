document.addEventListener('DOMContentLoaded', () => {
  // -01. Автоопределение устройства (телефон / планшет / ПК)
  function detectDeviceEnvironment() {
    const ua = navigator.userAgent || '';
    const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const isNarrowScreen = window.innerWidth <= 768;
    const isMobile = Boolean(isMobileUa || (isCoarsePointer && isNarrowScreen));

    document.documentElement.classList.toggle('is-mobile', isMobile);
    document.documentElement.classList.toggle('is-desktop', !isMobile);
    document.body.classList.toggle('is-mobile', isMobile);
    document.body.classList.toggle('is-desktop', !isMobile);

    const wheelHintLabel = document.getElementById('wheel-hint-label');
    const dinoSubtitle = document.getElementById('dino-subtitle');
    const dinoMsgTitle = document.getElementById('dino-msg-title');

    if (wheelHintLabel) {
      wheelHintLabel.textContent = isMobile ? 'Свайп' : 'Колёсико';
    }
    if (dinoSubtitle) {
      dinoSubtitle.textContent = isMobile
        ? 'Тап — прыжок · Удержание — присесть'
        : 'Space / ↑ — прыжок · ↓ — присесть';
    }
    if (dinoMsgTitle) {
      dinoMsgTitle.textContent = isMobile
        ? 'Нажми на экран, чтобы начать'
        : 'Нажми Space или кликни';
    }

    return isMobile;
  }

  let isMobileDevice = detectDeviceEnvironment();
  window.addEventListener('resize', () => {
    isMobileDevice = detectDeviceEnvironment();
  });

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

  // 00. Живой Discord профиль, рамка аватара, устройство и запрет раскрытия при offline
  const DISCORD_USER_ID = '1378047204119547989';
  const discordCard = document.getElementById('discord-card');
  const dcAvatarEl = document.getElementById('dc-avatar');
  const dcDecorationEl = document.getElementById('dc-avatar-decoration');
  const dcStatusDotEl = document.getElementById('dc-status-dot');
  const dcUsernameEl = document.getElementById('dc-username');
  const dcHandleEl = document.getElementById('dc-handle');
  const dcStatusTextEl = document.getElementById('dc-status-text');
  const dcDeviceBadgeEl = document.getElementById('dc-device-badge');
  const dcSummaryLineEl = document.getElementById('dc-summary-line');
  const dcExpandHintEl = document.getElementById('dc-expand-hint');
  const dcCustomBoxEl = document.getElementById('dc-custom-box');
  const dcCustomEmojiEl = document.getElementById('dc-custom-emoji');
  const dcCustomTextEl = document.getElementById('dc-custom-text');
  const dcRpcImgEl = document.getElementById('dc-rpc-img');
  const dcRpcNameEl = document.getElementById('dc-rpc-name');
  const dcRpcDetailsEl = document.getElementById('dc-rpc-details');
  const dcRpcStateEl = document.getElementById('dc-rpc-state');
  const dcRpcElapsedEl = document.getElementById('dc-rpc-elapsed');

  let activeRpcStartMs = null;

  const DEVICE_ICONS = {
    desktop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
    mobile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
  };

  function resolveActiveDevice(data) {
    if (data?.active_on_discord_desktop) {
      return { key: 'desktop', label: 'В сети с ПК' };
    }
    if (data?.active_on_discord_mobile) {
      return { key: 'mobile', label: 'В сети с телефона' };
    }
    if (data?.active_on_discord_web) {
      return { key: 'web', label: 'В сети в браузере' };
    }
    return null;
  }

  if (discordCard) {
    discordCard.addEventListener('mousemove', (e) => {
      if (isMobileDevice || discordCard.classList.contains('is-offline')) return;
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

    discordCard.addEventListener('click', () => {
      if (!isMobileDevice || discordCard.classList.contains('is-offline')) return;
      discordCard.classList.toggle('mobile-expanded');
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

      const decoAsset = user.avatar_decoration_data?.asset;
      if (decoAsset) {
        dcDecorationEl.src = `https://cdn.discordapp.com/avatar-decoration-presets/${decoAsset}.png?size=160&passthrough=true`;
        dcDecorationEl.classList.remove('hidden-icon');
      } else {
        dcDecorationEl.classList.add('hidden-icon');
      }
    }

    const status = data.discord_status || 'offline';
    const isOffline = status === 'offline';

    dcStatusDotEl.className = `dc-status-dot ${status}`;
    dcStatusTextEl.className = `discord-status-badge ${status}`;
    dcStatusTextEl.textContent = isOffline ? 'offline' : status;

    const activeDevice = !isOffline ? resolveActiveDevice(data) : null;
    if (dcDeviceBadgeEl) {
      if (activeDevice && DEVICE_ICONS[activeDevice.key]) {
        dcDeviceBadgeEl.innerHTML = DEVICE_ICONS[activeDevice.key];
        dcDeviceBadgeEl.title = activeDevice.label;
        dcDeviceBadgeEl.className = `dc-device-badge ${status}`;
      } else {
        dcDeviceBadgeEl.innerHTML = '';
        dcDeviceBadgeEl.className = 'dc-device-badge hidden-icon';
      }
    }

    if (isOffline) {
      discordCard.classList.add('is-offline');
      discordCard.classList.remove('is-tilting', 'mobile-expanded');
      discordCard.style.setProperty('--dc-rx', '0deg');
      discordCard.style.setProperty('--dc-ry', '0deg');
      discordCard.style.setProperty('--dc-ty', '0px');
      dcExpandHintEl.classList.add('hidden-icon');
      dcCustomBoxEl.classList.add('hidden-icon');
      dcSummaryLineEl.textContent = 'Не в сети';
      activeRpcStartMs = null;
      return;
    }

    discordCard.classList.remove('is-offline');
    dcExpandHintEl.classList.remove('hidden-icon');

    const activities = Array.isArray(data.activities) ? data.activities : [];
    const customAct = activities.find((a) => a.type === 4);
    const rpcAct = activities.find((a) => a.type !== 4);

    const hasCustomText = Boolean(customAct && (customAct.state || customAct.emoji?.name));
    if (hasCustomText) {
      const emojiStr = customAct.emoji?.name && !customAct.emoji?.id ? customAct.emoji.name : '';
      dcCustomEmojiEl.textContent = emojiStr;
      dcCustomTextEl.textContent = customAct.state || '';
      dcCustomBoxEl.classList.remove('hidden-icon');
    } else {
      dcCustomBoxEl.classList.add('hidden-icon');
    }

    const actionVerb = isMobileDevice ? 'Нажми' : 'Наведи';
    if (rpcAct) {
      dcSummaryLineEl.textContent = `Играет / активен: ${rpcAct.name}`;
    } else if (hasCustomText) {
      dcSummaryLineEl.textContent = `Есть кастомный статус — ${actionVerb.toLowerCase()}`;
    } else {
      dcSummaryLineEl.textContent = `${actionVerb}, чтобы посмотреть RPC`;
    }

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
  const tabNavRail = document.getElementById('tab-nav-rail');

  let isEntered = false;
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
    isEntered = true;
    entryScreen.classList.add('fade-out');
    mainContent.classList.remove('hidden');
    tabNavRail.classList.remove('hidden');

    requestAnimationFrame(() => {
      mainContent.classList.add('revealed');
    });

    initAudioAnalyser();
    audio.play().catch(() => {});
  });

  // 1.4. Пасхалка: 5 кликов по аватарке запускают плавную метель, остановка на Q
  const mainAvatar = document.getElementById('main-avatar');
  const blizzardBadge = document.getElementById('blizzard-badge');
  let avatarClickCount = 0;
  let avatarClickResetTimer = null;
  let blizzardTargetIntensity = 0;
  let blizzardCurrentIntensity = 0;

  function startBlizzard() {
    blizzardTargetIntensity = 1;
    document.body.classList.add('blizzard-active');
    if (blizzardBadge) {
      blizzardBadge.classList.add('visible');
    }
  }

  function stopBlizzard() {
    if (blizzardTargetIntensity === 0 && blizzardCurrentIntensity < 0.01) return;
    blizzardTargetIntensity = 0;
    document.body.classList.remove('blizzard-active');
    if (blizzardBadge) {
      blizzardBadge.classList.remove('visible');
    }
  }

  if (mainAvatar) {
    mainAvatar.addEventListener('click', () => {
      avatarClickCount += 1;
      clearTimeout(avatarClickResetTimer);
      avatarClickResetTimer = setTimeout(() => {
        avatarClickCount = 0;
      }, 1800);

      if (avatarClickCount >= 5) {
        avatarClickCount = 0;
        startBlizzard();
      }
    });
  }

  if (blizzardBadge) {
    blizzardBadge.addEventListener('click', stopBlizzard);
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q' || e.key === 'й' || e.key === 'Й') {
      if (blizzardTargetIntensity > 0 || blizzardCurrentIntensity > 0.05) {
        stopBlizzard();
      }
    }
  });

  // 1.5. Переключение между вкладкой профиля и мини-игрой по колёсику мыши, свайпу или точкам справа
  const tabPanels = [
    document.getElementById('tab-profile'),
    document.getElementById('tab-dino')
  ];
  const tabDots = document.querySelectorAll('.tab-dot');
  const wheelHint = document.getElementById('wheel-hint');
  let activeTabIndex = 0;
  let lastWheelSwitchTime = 0;

  function switchTab(nextIndex) {
    if (nextIndex < 0 || nextIndex >= tabPanels.length || nextIndex === activeTabIndex) return;
    activeTabIndex = nextIndex;

    tabPanels.forEach((panel, idx) => {
      panel.classList.toggle('active', idx === activeTabIndex);
    });
    tabDots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === activeTabIndex);
    });

    if (wheelHint && !wheelHint.classList.contains('dismissed')) {
      wheelHint.classList.add('dismissed');
    }

    if (activeTabIndex === 1) {
      resizeDinoCanvas();
    }
  }

  tabDots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const targetIdx = parseInt(dot.getAttribute('data-tab') || '0', 10);
      switchTab(targetIdx);
    });
  });

  window.addEventListener('wheel', (e) => {
    if (!isEntered) return;
    if (Math.abs(e.deltaY) < 12) return;

    const now = Date.now();
    if (now - lastWheelSwitchTime < 460) return;
    lastWheelSwitchTime = now;

    if (e.deltaY > 0) {
      switchTab(activeTabIndex === 0 ? 1 : 0);
    } else {
      switchTab(activeTabIndex === 1 ? 0 : 1);
    }
  }, { passive: true });

  let touchStartY = null;
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (!isEntered || touchStartY === null || e.changedTouches.length === 0) return;
    const diffY = touchStartY - e.changedTouches[0].clientY;
    touchStartY = null;
    if (Math.abs(diffY) > 55) {
      switchTab(diffY > 0 ? 1 : 0);
    }
  }, { passive: true });

  // 1.6. Улучшенная мини-игра "Динозаврик" (классические зелёные кактусы, приседание, птицы, день/ночь, ретро-звуки)
  const dinoStage = document.getElementById('dino-stage');
  const dinoCanvas = document.getElementById('dino-canvas');
  const dinoCtx = dinoCanvas.getContext('2d');
  const dinoScoreEl = document.getElementById('dino-score');
  const dinoBestEl = document.getElementById('dino-best');
  const dinoOverlayMsg = document.getElementById('dino-overlay-msg');
  const dinoMsgTitle = document.getElementById('dino-msg-title');
  const dinoMsgSub = document.getElementById('dino-msg-sub');

  const DINO_BEST_KEY = 'sekailauren_dino_best_v1';
  let dinoBest = parseInt(localStorage.getItem(DINO_BEST_KEY) || '0', 10) || 0;
  dinoBestEl.textContent = String(dinoBest).padStart(4, '0');

  let dinoW = 380;
  let dinoH = 175;
  const GROUND_OFFSET = 26;

  function resizeDinoCanvas() {
    if (!dinoCanvas) return;
    const rect = dinoStage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    dinoW = Math.max(260, Math.floor(rect.width || 380));
    dinoH = Math.max(150, Math.floor(rect.height || 175));
    dinoCanvas.width = Math.floor(dinoW * dpr);
    dinoCanvas.height = Math.floor(dinoH * dpr);
    dinoCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resizeDinoCanvas();
  window.addEventListener('resize', resizeDinoCanvas);

  // Лёгкие 8-битные звуки через Web Audio API (без внешних файлов)
  let sfxCtx = null;
  function playDinoSound(type) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!sfxCtx) sfxCtx = new AudioContextClass();
      if (sfxCtx.state === 'suspended') sfxCtx.resume().catch(() => {});

      const osc = sfxCtx.createOscillator();
      const gain = sfxCtx.createGain();
      osc.type = 'square';
      const now = sfxCtx.currentTime;

      if (type === 'jump') {
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(560, now + 0.09);
        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
        osc.connect(gain);
        gain.connect(sfxCtx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'milestone') {
        osc.frequency.setValueAtTime(587, now);
        osc.frequency.setValueAtTime(880, now + 0.07);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(sfxCtx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
      } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.22);
        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
        osc.connect(gain);
        gain.connect(sfxCtx.destination);
        osc.start(now);
        osc.stop(now + 0.24);
      }
    } catch (_) {}
  }

  const dinoStars = Array.from({ length: 16 }, () => ({
    x: Math.random(),
    y: Math.random() * 0.55,
    size: Math.random() * 1.4 + 0.7,
    phase: Math.random() * Math.PI * 2
  }));

  const dinoState = {
    running: false,
    gameOver: false,
    score: 0,
    lastMilestone: 0,
    speed: 4.5,
    groundScroll: 0,
    nextSpawnFrames: 60,
    nightFactor: 0,
    player: {
      x: 42,
      y: 0,
      w: 22,
      h: 26,
      vy: 0,
      grounded: true,
      ducking: false
    },
    obstacles: [],
    dust: []
  };

  function spawnDinoDust(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      dinoState.dust.push({
        x: x + Math.random() * 10,
        y: y - Math.random() * 3,
        vx: -Math.random() * 1.6 - 0.5,
        vy: -Math.random() * 1.1 - 0.2,
        alpha: 0.75,
        size: Math.random() * 2 + 1
      });
    }
  }

  function resetDinoGame() {
    dinoState.running = true;
    dinoState.gameOver = false;
    dinoState.score = 0;
    dinoState.lastMilestone = 0;
    dinoState.speed = 4.5;
    dinoState.obstacles = [];
    dinoState.dust = [];
    dinoState.nextSpawnFrames = 52;
    dinoState.player.ducking = false;
    dinoState.player.h = 26;
    dinoState.player.y = dinoH - GROUND_OFFSET - dinoState.player.h;
    dinoState.player.vy = 0;
    dinoState.player.grounded = true;
    dinoScoreEl.textContent = '0000';
    dinoOverlayMsg.classList.add('hidden-msg');
  }

  function triggerDinoJump() {
    if (activeTabIndex !== 1) return;
    if (!dinoState.running || dinoState.gameOver) {
      resetDinoGame();
      return;
    }
    if (dinoState.player.grounded) {
      dinoState.player.ducking = false;
      dinoState.player.h = 26;
      dinoState.player.vy = -8.9;
      dinoState.player.grounded = false;
      spawnDinoDust(dinoState.player.x + 4, dinoH - GROUND_OFFSET, 6);
      playDinoSound('jump');
    }
  }

  function setDinoDuck(isDucking) {
    if (!dinoState.running || dinoState.gameOver) return;
    const p = dinoState.player;
    p.ducking = isDucking;
    if (!p.grounded && isDucking) {
      p.vy = Math.max(p.vy, 7.5);
    }
  }

  let dinoTouchHoldTimer = null;
  dinoStage.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (!dinoState.running || dinoState.gameOver) {
      resetDinoGame();
      return;
    }
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      clearTimeout(dinoTouchHoldTimer);
      dinoTouchHoldTimer = setTimeout(() => {
        setDinoDuck(true);
      }, 170);
    }
    triggerDinoJump();
  });

  dinoStage.addEventListener('pointerup', () => {
    clearTimeout(dinoTouchHoldTimer);
    setDinoDuck(false);
  });

  dinoStage.addEventListener('pointercancel', () => {
    clearTimeout(dinoTouchHoldTimer);
    setDinoDuck(false);
  });

  window.addEventListener('keydown', (e) => {
    if (activeTabIndex !== 1) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      triggerDinoJump();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      setDinoDuck(true);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      setDinoDuck(false);
    }
  });

  function drawDinoCharacter(p, timeMs) {
    dinoCtx.save();
    dinoCtx.fillStyle = '#f3f4f6';

    if (p.ducking && p.grounded) {
      // Пригнувшийся динозавр
      dinoCtx.beginPath();
      dinoCtx.roundRect(p.x - 4, p.y + 4, p.w + 7, 11, 4);
      dinoCtx.roundRect(p.x + p.w - 2, p.y + 3, 11, 9, 3);
      dinoCtx.fill();

      dinoCtx.fillStyle = '#09090b';
      dinoCtx.fillRect(p.x + p.w + 4, p.y + 5, 2.2, 2.2);

      dinoCtx.fillStyle = '#d1d5db';
      const step = dinoState.running ? Math.sin(timeMs * 0.03) * 2.2 : 0;
      dinoCtx.fillRect(p.x + 2, p.y + 14 + step, 4, 4 - step);
      dinoCtx.fillRect(p.x + 11, p.y + 14 - step, 4, 4 + step);
    } else {
      // Обычный бегущий / прыгающий динозавр
      dinoCtx.beginPath();
      dinoCtx.roundRect(p.x, p.y + 7, p.w - 4, p.h - 11, 4);
      dinoCtx.roundRect(p.x + 7, p.y, p.w - 7, 12, 4);
      dinoCtx.roundRect(p.x - 5, p.y + 11, 7, 6, 2);
      dinoCtx.fill();

      dinoCtx.fillStyle = '#09090b';
      dinoCtx.fillRect(p.x + p.w - 6, p.y + 3, 2.5, 2.5);

      dinoCtx.fillStyle = '#d1d5db';
      const step = dinoState.running && p.grounded ? Math.sin(timeMs * 0.026) * 2.5 : 0;
      dinoCtx.fillRect(p.x + 3, p.y + p.h - 5 + step, 4, 5 - step);
      dinoCtx.fillRect(p.x + 11, p.y + p.h - 5 - step, 4, 5 + step);
    }
    dinoCtx.restore();
  }

  // Классический зелёный кактус обычного цвета
  function drawCactus(c) {
    dinoCtx.save();
    dinoCtx.fillStyle = '#2e8b57';
    dinoCtx.strokeStyle = '#1f633d';
    dinoCtx.lineWidth = 1;

    const trunkW = Math.max(6, c.w * 0.44);
    const trunkX = c.x + (c.w - trunkW) / 2;

    dinoCtx.beginPath();
    dinoCtx.roundRect(trunkX, c.y, trunkW, c.h, 3);
    dinoCtx.roundRect(c.x, c.y + c.h * 0.30, trunkX - c.x + 2, 4, 2);
    dinoCtx.roundRect(c.x, c.y + c.h * 0.16, 4, c.h * 0.22, 2);
    dinoCtx.roundRect(trunkX + trunkW - 2, c.y + c.h * 0.40, c.x + c.w - (trunkX + trunkW) + 2, 4, 2);
    dinoCtx.roundRect(c.x + c.w - 4, c.y + c.h * 0.24, 4, c.h * 0.22, 2);
    dinoCtx.fill();
    dinoCtx.stroke();

    // Светлая полоска объёма и пара мелких колючек
    dinoCtx.fillStyle = '#3ca368';
    dinoCtx.fillRect(trunkX + 1.5, c.y + 3, 1.5, c.h - 6);
    dinoCtx.restore();
  }

  function drawBird(b, timeMs) {
    dinoCtx.save();
    const flap = Math.sin(timeMs * 0.022 + b.phase) > 0;
    dinoCtx.fillStyle = '#9ca3af';

    // Тело и клюв птицы
    dinoCtx.beginPath();
    dinoCtx.roundRect(b.x + 4, b.y + 6, b.w - 8, 7, 3);
    dinoCtx.fill();

    dinoCtx.fillStyle = '#d1d5db';
    dinoCtx.beginPath();
    dinoCtx.moveTo(b.x + 4, b.y + 8);
    dinoCtx.lineTo(b.x - 2, b.y + 10);
    dinoCtx.lineTo(b.x + 4, b.y + 11);
    dinoCtx.closePath();
    dinoCtx.fill();

    // Взмах крыла
    dinoCtx.fillStyle = '#e5e7eb';
    dinoCtx.beginPath();
    if (flap) {
      dinoCtx.moveTo(b.x + 9, b.y + 7);
      dinoCtx.lineTo(b.x + 14, b.y);
      dinoCtx.lineTo(b.x + 18, b.y + 7);
    } else {
      dinoCtx.moveTo(b.x + 9, b.y + 11);
      dinoCtx.lineTo(b.x + 14, b.y + 17);
      dinoCtx.lineTo(b.x + 18, b.y + 11);
    }
    dinoCtx.closePath();
    dinoCtx.fill();
    dinoCtx.restore();
  }

  function stepAndRenderDino(timeMs) {
    dinoCtx.clearRect(0, 0, dinoW, dinoH);
    const groundY = dinoH - GROUND_OFFSET;

    // Плавный цикл день / ночь каждые 250 очков
    const isNightTarget = Math.floor(dinoState.score / 250) % 2 === 1 ? 1 : 0;
    dinoState.nightFactor += (isNightTarget - dinoState.nightFactor) * 0.03;

    if (dinoState.nightFactor > 0.02) {
      dinoCtx.save();
      dinoCtx.fillStyle = `rgba(15, 23, 42, ${dinoState.nightFactor * 0.48})`;
      dinoCtx.fillRect(0, 0, dinoW, dinoH);

      // Луна и звёзды ночью
      dinoCtx.fillStyle = `rgba(241, 245, 249, ${dinoState.nightFactor * 0.78})`;
      dinoCtx.beginPath();
      dinoCtx.arc(dinoW - 44, 28, 8, 0, Math.PI * 2);
      dinoCtx.fill();

      for (let i = 0; i < dinoStars.length; i++) {
        const st = dinoStars[i];
        const twinkle = 0.5 + 0.5 * Math.sin(timeMs * 0.005 + st.phase);
        dinoCtx.fillStyle = `rgba(255, 255, 255, ${dinoState.nightFactor * twinkle * 0.75})`;
        dinoCtx.fillRect(st.x * dinoW, st.y * dinoH, st.size, st.size);
      }
      dinoCtx.restore();
    }

    const p = dinoState.player;
    const activePlayerH = p.ducking && p.grounded ? 16 : 26;
    p.h = activePlayerH;

    if (!dinoState.running && !dinoState.gameOver) {
      p.y = groundY - p.h;
    }

    // Линия земли и камешки
    dinoCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    dinoCtx.lineWidth = 1.5;
    dinoCtx.beginPath();
    dinoCtx.moveTo(0, groundY);
    dinoCtx.lineTo(dinoW, groundY);
    dinoCtx.stroke();

    if (dinoState.running && !dinoState.gameOver) {
      dinoState.groundScroll = (dinoState.groundScroll + dinoState.speed) % 28;
    }
    dinoCtx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    for (let gx = -dinoState.groundScroll; gx < dinoW; gx += 28) {
      dinoCtx.fillRect(gx, groundY + 6, 10, 2);
      dinoCtx.fillRect(gx + 16, groundY + 11, 4, 1.5);
    }

    if (dinoState.running && !dinoState.gameOver) {
      const wasAirborne = !p.grounded;
      p.vy += 0.45;
      p.y += p.vy;

      if (p.y >= groundY - p.h) {
        p.y = groundY - p.h;
        p.vy = 0;
        p.grounded = true;
        if (wasAirborne) {
          spawnDinoDust(p.x + 6, groundY, 5);
        }
      }

      if (p.grounded && Math.random() < 0.22) {
        spawnDinoDust(p.x + 2, groundY, 1);
      }

      // Спавн кактусов или птиц
      dinoState.nextSpawnFrames -= 1;
      if (dinoState.nextSpawnFrames <= 0) {
        const canSpawnBird = dinoState.score >= 120 && Math.random() < 0.3;
        if (canSpawnBird) {
          const flyHigh = Math.random() < 0.55;
          const birdH = 18;
          const birdY = flyHigh ? groundY - 34 : groundY - 21;
          dinoState.obstacles.push({
            kind: 'bird',
            x: dinoW + 14,
            y: birdY,
            w: 24,
            h: birdH,
            phase: Math.random() * Math.PI * 2
          });
        } else {
          const isDoubleCactus = dinoState.score >= 80 && Math.random() < 0.28;
          const h = 22 + Math.floor(Math.random() * 13);
          const w = isDoubleCactus ? 25 : (14 + Math.floor(Math.random() * 6));
          dinoState.obstacles.push({
            kind: 'cactus',
            x: dinoW + 12,
            y: groundY - h,
            w,
            h
          });
        }
        dinoState.nextSpawnFrames = Math.max(42, Math.floor(70 + Math.random() * 45 - dinoState.speed * 2));
      }

      // Движение препятствий и проверка столкновений
      for (let i = dinoState.obstacles.length - 1; i >= 0; i--) {
        const ob = dinoState.obstacles[i];
        ob.x -= ob.kind === 'bird' ? dinoState.speed * 1.12 : dinoState.speed;

        const pad = 4;
        const playerRight = p.ducking && p.grounded ? p.x + p.w + 5 : p.x + p.w;
        const hitX = p.x + pad < ob.x + ob.w - pad && playerRight - pad > ob.x + pad;
        const hitY = p.y + pad < ob.y + ob.h - pad && p.y + p.h - pad > ob.y + pad;

        if (hitX && hitY) {
          dinoState.gameOver = true;
          dinoState.running = false;
          playDinoSound('hit');
          const finalScore = Math.floor(dinoState.score);
          if (finalScore > dinoBest) {
            dinoBest = finalScore;
            localStorage.setItem(DINO_BEST_KEY, String(dinoBest));
            dinoBestEl.textContent = String(dinoBest).padStart(4, '0');
          }
          dinoMsgTitle.textContent = `Игра окончена · Счёт: ${finalScore}`;
          dinoMsgSub.textContent = isMobileDevice
            ? 'Тапни по экрану, чтобы сыграть снова'
            : 'Нажми Space или кликни, чтобы сыграть снова';
          dinoOverlayMsg.classList.remove('hidden-msg');
        }

        if (ob.x + ob.w < -15) {
          dinoState.obstacles.splice(i, 1);
        }
      }

      dinoState.score += 0.17;
      const wholeScore = Math.floor(dinoState.score);
      if (wholeScore > 0 && wholeScore % 100 === 0 && wholeScore !== dinoState.lastMilestone) {
        dinoState.lastMilestone = wholeScore;
        playDinoSound('milestone');
      }

      dinoState.speed = Math.min(9.2, 4.5 + dinoState.score * 0.0048);
      dinoScoreEl.textContent = String(wholeScore).padStart(4, '0');
    }

    // Пылинки из-под лап
    for (let i = dinoState.dust.length - 1; i >= 0; i--) {
      const d = dinoState.dust[i];
      d.x += d.vx;
      d.y += d.vy;
      d.alpha -= 0.04;
      if (d.alpha <= 0) {
        dinoState.dust.splice(i, 1);
      } else {
        dinoCtx.fillStyle = `rgba(229, 231, 235, ${d.alpha})`;
        dinoCtx.fillRect(d.x, d.y, d.size, d.size);
      }
    }

    for (let i = 0; i < dinoState.obstacles.length; i++) {
      const ob = dinoState.obstacles[i];
      if (ob.kind === 'bird') {
        drawBird(ob, timeMs);
      } else {
        drawCactus(ob);
      }
    }
    drawDinoCharacter(p, timeMs);
  }

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
    if (isMobileDevice) return;
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
    if (!isMobileDevice) openVolumeDrawer();
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

  // 6. 3D-наклон полупрозрачных кнопок за курсором мыши (на ПК)
  const tiltButtons = document.querySelectorAll('.tilt-btn');
  tiltButtons.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      if (isMobileDevice) return;
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

  // 7. Частицы у ползунка прогресса и громкости
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

    if (activeTabIndex === 1) {
      stepAndRenderDino(timeMs);
    }

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

  // 8. Анимация снежинок на фоне и за курсором + плавная метель (пасхалка)
  const canvas = document.getElementById('snow-canvas');
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const ambientSnow = [];
  const blizzardSnow = [];
  const cursorSnow = [];
  const BASE_AMBIENT_COUNT = 95;
  const MAX_BLIZZARD_COUNT = 260;

  function createAmbientFlake(randomY = true) {
    return {
      x: Math.random() * width,
      y: randomY ? Math.random() * height : -10,
      radius: Math.random() * 2.4 + 0.8,
      speedY: Math.random() * 0.9 + 0.35,
      speedX: (Math.random() - 0.5) * 0.45,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: Math.random() * 0.02 + 0.008,
      opacity: Math.random() * 0.5 + 0.16
    };
  }

  for (let i = 0; i < BASE_AMBIENT_COUNT; i++) {
    ambientSnow.push(createAmbientFlake(true));
  }

  function spawnBlizzardFlake() {
    const fromTop = Math.random() < 0.65;
    blizzardSnow.push({
      x: fromTop ? Math.random() * (width + 200) - 100 : -15,
      y: fromTop ? -12 : Math.random() * height,
      radius: Math.random() * 2.8 + 0.9,
      speedY: Math.random() * 3.8 + 2.2,
      speedX: Math.random() * 4.5 + 2.4,
      swirlPhase: Math.random() * Math.PI * 2,
      swirlSpeed: Math.random() * 0.06 + 0.025,
      opacity: Math.random() * 0.65 + 0.25
    });
  }

  function spawnCursorFlakes(x, y) {
    const isBlizzard = blizzardCurrentIntensity > 0.15;
    const count = isBlizzard ? Math.round(2 + blizzardCurrentIntensity * 7) : 2;

    for (let i = 0; i < count; i++) {
      if (isBlizzard) {
        const angle = (Math.random() - 0.35) * 1.1;
        const gust = (2.2 + Math.random() * 3.8) * blizzardCurrentIntensity;
        cursorSnow.push({
          x: x + (Math.random() - 0.5) * 26 * blizzardCurrentIntensity,
          y: y + (Math.random() - 0.5) * 26 * blizzardCurrentIntensity,
          speedX: Math.cos(angle) * gust + 1.4 * blizzardCurrentIntensity,
          speedY: Math.sin(angle) * gust + (Math.random() * 1.8 + 0.6),
          radius: Math.random() * 2.9 + 1.0,
          opacity: 0.95,
          decay: Math.random() * 0.018 + 0.012,
          swirl: (Math.random() - 0.5) * 0.16
        });
      } else {
        cursorSnow.push({
          x: x + (Math.random() - 0.5) * 14,
          y: y + (Math.random() - 0.5) * 14,
          radius: Math.random() * 2.6 + 1.2,
          speedX: (Math.random() - 0.5) * 1.4,
          speedY: Math.random() * 1.2 + 0.5,
          opacity: 0.95,
          decay: Math.random() * 0.015 + 0.012,
          swirl: 0
        });
      }
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

  function drawFlake(x, y, radius, opacity, stretchX = 0, stretchY = 0) {
    ctx.beginPath();
    if (Math.abs(stretchX) > 0.4 || Math.abs(stretchY) > 0.4) {
      ctx.moveTo(x - stretchX, y - stretchY);
      ctx.lineTo(x + stretchX, y + stretchY);
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = radius * 1.15;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else {
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
    }
  }

  function animate(timeMs = 0) {
    ctx.clearRect(0, 0, width, height);

    // Плавное нарастание и затухание метели
    blizzardCurrentIntensity += (blizzardTargetIntensity - blizzardCurrentIntensity) * 0.025;
    if (blizzardTargetIntensity === 0 && blizzardCurrentIntensity < 0.004) {
      blizzardCurrentIntensity = 0;
    }

    // Обычные снежинки ускоряются и отклоняются ветром во время метели
    const windBoostX = blizzardCurrentIntensity * 4.2 + Math.sin(timeMs * 0.0022) * 1.1 * blizzardCurrentIntensity;
    const windBoostY = 1 + blizzardCurrentIntensity * 2.4;

    for (let i = 0; i < ambientSnow.length; i++) {
      const f = ambientSnow[i];
      f.swayPhase += f.swaySpeed * (1 + blizzardCurrentIntensity * 2);
      f.y += f.speedY * windBoostY;
      f.x += f.speedX + windBoostX + Math.sin(f.swayPhase) * (0.25 + blizzardCurrentIntensity * 0.8);

      if (f.y > height + 10) {
        f.y = -8;
        f.x = Math.random() * width;
      }
      if (f.x > width + 10) f.x = -8;
      if (f.x < -10) f.x = width + 8;

      const streak = blizzardCurrentIntensity * 2.2;
      drawFlake(f.x, f.y, f.radius, f.opacity, streak, streak * 0.65);
    }

    // Дополнительные плотные снежинки метели
    const desiredBlizzardCount = Math.floor(MAX_BLIZZARD_COUNT * blizzardCurrentIntensity);
    while (blizzardSnow.length < desiredBlizzardCount) {
      spawnBlizzardFlake();
    }

    for (let i = blizzardSnow.length - 1; i >= 0; i--) {
      const bf = blizzardSnow[i];
      bf.swirlPhase += bf.swirlSpeed;
      const activeFactor = Math.max(0.25, blizzardCurrentIntensity);
      bf.x += (bf.speedX + Math.cos(bf.swirlPhase) * 1.1) * activeFactor;
      bf.y += (bf.speedY + Math.sin(bf.swirlPhase) * 0.7) * activeFactor;

      if (blizzardTargetIntensity === 0) {
        bf.opacity -= 0.008;
      }

      if (bf.opacity <= 0.01 || bf.y > height + 20 || bf.x > width + 40) {
        if (blizzardSnow.length > desiredBlizzardCount || bf.opacity <= 0.01) {
          blizzardSnow.splice(i, 1);
          continue;
        }
        bf.x = Math.random() < 0.65 ? Math.random() * (width + 200) - 100 : -15;
        bf.y = bf.x < 0 ? Math.random() * height : -12;
      }

      const drawAlpha = bf.opacity * Math.min(1, blizzardCurrentIntensity * 1.35);
      const streakX = 2.8 * blizzardCurrentIntensity;
      const streakY = 2.1 * blizzardCurrentIntensity;
      drawFlake(bf.x, bf.y, bf.radius, drawAlpha, streakX, streakY);
    }

    // Снежинки за курсором
    for (let i = cursorSnow.length - 1; i >= 0; i--) {
      const p = cursorSnow[i];
      if (p.swirl) {
        p.speedY += Math.sin(timeMs * 0.01 + i) * p.swirl;
      }
      p.x += p.speedX;
      p.y += p.speedY;
      p.opacity -= p.decay;

      if (p.opacity <= 0) {
        cursorSnow.splice(i, 1);
      } else {
        const cStreak = blizzardCurrentIntensity * 1.8;
        drawFlake(p.x, p.y, p.radius, p.opacity, cStreak, cStreak * 0.5);
      }
    }

    requestAnimationFrame(animate);
  }

  animate();
});