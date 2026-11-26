document.addEventListener('DOMContentLoaded', () => {
  // Переключатель темы с сохранением в localStorage
  const ACCENT_KEY = 'sekailauren_accent_theme_v1';
  const themeDots = document.querySelectorAll('.theme-dot');

  function applyAccentTheme(accentName) {
    const allowed = ['neon', 'ice', 'hacker', 'lofi'];
    const chosen = allowed.includes(accentName) ? accentName : 'neon';
    document.body.setAttribute('data-accent', chosen);
    localStorage.setItem(ACCENT_KEY, chosen);
    themeDots.forEach((dot) => {
      dot.classList.toggle('active', dot.getAttribute('data-accent') === chosen);
    });
  }
  applyAccentTheme(localStorage.getItem(ACCENT_KEY) || 'neon');
  themeDots.forEach((dot) => {
    dot.addEventListener('click', () => applyAccentTheme(dot.getAttribute('data-accent')));
  });

  // Копирование в буфер + тост
  const copyToast = document.getElementById('copy-toast');
  let toastTimer = null;

  function showCopyToast(text = 'Скопировано') {
    if (!copyToast) return;
    copyToast.textContent = text;
    copyToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => copyToast.classList.remove('show'), 1500);
  }

  function copyToClipboard(val) {
    if (!val) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(val).catch(() => {});
    }
    showCopyToast(`Скопировано: ${val}`);
  }

  const emailLinkBtn = document.getElementById('email-link-btn');
  if (emailLinkBtn) {
    emailLinkBtn.addEventListener('click', () => {
      copyToClipboard(emailLinkBtn.getAttribute('data-copy') || '');
    });
  }

  // Строка живого фокуса под био
  const moodLine = document.getElementById('mood-line');
  const moodPhrases = [
    'сейчас: пилю новые фичи и слушаю треки',
    'фокус: Python / C++ и эксперименты с UI',
    'вайб: ночной код и немного Lo-Fi'
  ];
  let moodIdx = 0;
  if (moodLine) {
    moodLine.addEventListener('click', () => {
      moodIdx = (moodIdx + 1) % moodPhrases.length;
      moodLine.textContent = moodPhrases[moodIdx];
    });
  }

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

    if (wheelHintLabel) wheelHintLabel.textContent = isMobile ? 'Свайп' : 'Колёсико';
    if (dinoSubtitle) {
      dinoSubtitle.textContent = isMobile
        ? 'Тап — прыжок · Удержание — присесть'
        : 'Space / ↑ — прыжок · ↓ — присесть';
    }
    if (dinoMsgTitle) {
      dinoMsgTitle.textContent = isMobile ? 'Нажми на экран, чтобы начать' : 'Нажми Space или кликни';
    }
    return isMobile;
  }

  let isMobileDevice = detectDeviceEnvironment();
  window.addEventListener('resize', () => {
    isMobileDevice = detectDeviceEnvironment();
  });

  // Плеер + SoundCloud плейлист (с fallback на track.mp3)
  const audio = document.getElementById('audio-element');
  const scIframe = document.getElementById('sc-widget-iframe');
  const playerCoverImg = document.getElementById('player-cover-img');
  const playerTrackTitle = document.getElementById('player-track-title');
  const topPlayer = document.getElementById('top-player');
  const prevTrackBtn = document.getElementById('prev-track-btn');
  const nextTrackBtn = document.getElementById('next-track-btn');
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

  let scWidget = null;
  let scReady = false;
  let scPlaying = false;
  let scDurationMs = 0;
  let scPositionMs = 0;
  let useLocalFallback = false;

  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '00:00';
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  }

  function isAnyPlaying() {
    return useLocalFallback ? !audio.paused : scPlaying;
  }

  function syncPlayState() {
    const playing = isAnyPlaying();
    iconPlay.classList.toggle('hidden-icon', playing);
    iconPause.classList.toggle('hidden-icon', !playing);
  }

  function syncMuteState() {
    const isMutedNow = useLocalFallback
      ? (audio.muted || audio.volume <= 0.025)
      : (parseFloat(volumeSlider.value) <= 0.025);
    iconSoundOn.classList.toggle('hidden-icon', isMutedNow);
    iconSoundOff.classList.toggle('hidden-icon', !isMutedNow);
  }

  function syncScTrackMeta() {
    if (!scWidget || !scReady) return;
    scWidget.getCurrentSound((sound) => {
      if (!sound) return;
      if (sound.title && playerTrackTitle) playerTrackTitle.textContent = sound.title;
      const art = sound.artwork_url || sound.user?.avatar_url;
      if (art && playerCoverImg) {
        playerCoverImg.src = art.replace('-large.jpg', '-t200x200.jpg');
      }
      if (typeof sound.duration === 'number' && sound.duration > 0) {
        scDurationMs = sound.duration;
        durationTimeEl.textContent = formatTime(scDurationMs / 1000);
      }
    });
  }

  function initSoundCloudPlaylist() {
    if (!window.SC || !window.SC.Widget || !scIframe) {
      useLocalFallback = true;
      return;
    }
    try {
      scWidget = window.SC.Widget(scIframe);
      scWidget.bind(window.SC.Widget.Events.READY, () => {
        scReady = true;
        scWidget.setVolume(lastNonZeroVolume * 100);
        syncScTrackMeta();
      });
      scWidget.bind(window.SC.Widget.Events.PLAY, () => {
        scPlaying = true;
        syncScTrackMeta();
        syncPlayState();
      });
      scWidget.bind(window.SC.Widget.Events.PAUSE, () => {
        scPlaying = false;
        syncPlayState();
      });
      scWidget.bind(window.SC.Widget.Events.FINISH, () => {
        scPlaying = false;
        syncPlayState();
      });
      scWidget.bind(window.SC.Widget.Events.PLAY_PROGRESS, (data) => {
        if (isScrubbing) return;
        scPositionMs = data?.currentPosition || 0;
        if (scDurationMs > 0) {
          currentTimeEl.textContent = formatTime(scPositionMs / 1000);
          durationTimeEl.textContent = formatTime(scDurationMs / 1000);
          targetProgressPercent = Math.max(0, Math.min(100, (scPositionMs / scDurationMs) * 100));
          seekSlider.value = targetProgressPercent;
        }
      });
      scWidget.bind(window.SC.Widget.Events.ERROR, () => {
        if (!scPlaying) useLocalFallback = true;
      });
    } catch (_) {
      useLocalFallback = true;
    }
  }
  initSoundCloudPlaylist();

  function startPlayback() {
    if (!useLocalFallback && scWidget && scReady) {
      scWidget.play();
      scPlaying = true;
      syncPlayState();
      return;
    }
    initAudioAnalyser();
    audio.play().catch(() => {});
  }

  function pausePlayback() {
    if (!useLocalFallback && scWidget && scReady) {
      scWidget.pause();
      scPlaying = false;
      syncPlayState();
      return;
    }
    audio.pause();
  }

  function applyVolumeValue(val) {
    const clamped = Math.max(0, Math.min(1, val));
    targetVolumePercent = clamped * 100;
    volumeSlider.value = clamped;
    if (clamped <= 0.025) {
      audio.volume = 0;
      audio.muted = true;
      if (scWidget && scReady) scWidget.setVolume(0);
    } else {
      audio.muted = false;
      audio.volume = clamped;
      lastNonZeroVolume = clamped;
      if (scWidget && scReady) scWidget.setVolume(clamped * 100);
    }
    syncMuteState();
    spawnVolumeBurst(3);
  }

  if (prevTrackBtn) {
    prevTrackBtn.addEventListener('click', () => {
      if (!useLocalFallback && scWidget && scReady) {
        scWidget.prev();
        setTimeout(syncScTrackMeta, 250);
      } else {
        audio.currentTime = 0;
      }
    });
  }

  if (nextTrackBtn) {
    nextTrackBtn.addEventListener('click', () => {
      if (!useLocalFallback && scWidget && scReady) {
        scWidget.next();
        setTimeout(syncScTrackMeta, 250);
      } else {
        audio.currentTime = 0;
      }
    });
  }

  // Discord Lanyard
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

  if (dcHandleEl) {
    dcHandleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(dcHandleEl.textContent.trim());
    });
  }

  const DEVICE_ICONS = {
    desktop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
    mobile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
  };

  function resolveActiveDevice(data) {
    if (data?.active_on_discord_desktop) return { key: 'desktop', label: 'В сети с ПК' };
    if (data?.active_on_discord_mobile) return { key: 'mobile', label: 'В сети с телефона' };
    if (data?.active_on_discord_web) return { key: 'web', label: 'В сети в браузере' };
    return null;
  }

  if (discordCard) {
    discordCard.addEventListener('mousemove', (e) => {
      if (isMobileDevice || discordCard.classList.contains('is-offline')) return;
      const rect = discordCard.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      discordCard.style.setProperty('--mx', `${px.toFixed(1)}px`);
      discordCard.style.setProperty('--my', `${py.toFixed(1)}px`);
      discordCard.style.setProperty('--dc-rx', `${(-(py / rect.height - 0.5) * 9).toFixed(2)}deg`);
      discordCard.style.setProperty('--dc-ry', `${((px / rect.width - 0.5) * 9).toFixed(2)}deg`);
      discordCard.style.setProperty('--dc-ty', '-2px');
    });

    discordCard.addEventListener('mouseleave', () => {
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
    const raw = activity?.assets?.large_image || activity?.assets?.small_image;
    const appId = activity?.application_id;
    if (!raw) return '';
    if (raw.startsWith('mp:external/')) return `https://media.discordapp.net/external/${raw.replace('mp:external/', '')}`;
    if (appId) return `https://cdn.discordapp.com/app-assets/${appId}/${raw}.png`;
    return `https://cdn.discordapp.com/avatars/${discordUserId}/${raw}.png`;
  }

  function formatElapsed(startMs) {
    if (!startMs) return '';
    const diffSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    return hrs > 0
      ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function renderLanyardPresence(data) {
    if (!data) return;
    const user = data.discord_user;
    if (user) {
      dcUsernameEl.textContent = user.global_name || user.username || 'sekailauren';
      if (user.username) dcHandleEl.textContent = `@${user.username}`;
      if (user.avatar) {
        const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
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
      dcCustomEmojiEl.textContent = customAct.emoji?.name && !customAct.emoji?.id ? customAct.emoji.name : '';
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
      .then((json) => { if (json?.success && json?.data) renderLanyardPresence(json.data); })
      .catch(() => {});

    let heartbeatId = null;
    const ws = new WebSocket('wss://api.lanyard.rest/socket');
    ws.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.op === 1 && payload.d?.heartbeat_interval) {
          ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_USER_ID } }));
          clearInterval(heartbeatId);
          heartbeatId = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 3 }));
          }, payload.d.heartbeat_interval);
        } else if (payload.op === 0 && (payload.t === 'INIT_STATE' || payload.t === 'PRESENCE_UPDATE')) {
          renderLanyardPresence(payload.d);
        }
      } catch (_) {}
    });
    ws.addEventListener('close', () => clearInterval(heartbeatId));
    setInterval(() => {
      if (activeRpcStartMs) dcRpcElapsedEl.textContent = formatElapsed(activeRpcStartMs);
    }, 1000);
  }
  initLanyard();

  // Счетчик просмотров
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
    } catch (_) { seenIps = []; }

    const shouldIncrement = localStorage.getItem(DEVICE_FLAG_KEY) !== '1' && !(visitorIp && seenIps.includes(visitorIp));
    try {
      const res = await fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}/${shouldIncrement ? 'up' : 'get'}`, { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const val = typeof data?.count === 'number' ? data.count : (typeof data?.value === 'number' ? data.value : 1);
      viewsCountEl.textContent = String(Math.max(1, val));
      if (shouldIncrement) {
        localStorage.setItem(DEVICE_FLAG_KEY, '1');
        if (visitorIp) {
          seenIps.push(visitorIp);
          localStorage.setItem(SEEN_IPS_KEY, JSON.stringify(seenIps.slice(-20)));
        }
      }
    } catch (_) {
      viewsCountEl.textContent = '1';
    }
  }
  updateUniqueViewsCounter();

  // Вход по >my bio<
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
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
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
    requestAnimationFrame(() => mainContent.classList.add('revealed'));
    startPlayback();
  });

  // Пасхалка на © 2026 или набор "hack"
  const footerCopyright = document.getElementById('footer-copyright');
  let copyrightClicks = 0;
  let copyrightClickTimer = null;
  let hackerModeTimeout = null;
  let typedSecretBuffer = '';

  function triggerHackerEasterEgg(durationMs = 4200) {
    document.body.classList.add('hacker-mode');
    applyAccentTheme('hacker');
    clearTimeout(hackerModeTimeout);
    hackerModeTimeout = setTimeout(() => {
      document.body.classList.remove('hacker-mode');
      applyAccentTheme(localStorage.getItem(ACCENT_KEY) || 'neon');
    }, durationMs);
  }

  if (footerCopyright) {
    footerCopyright.addEventListener('click', () => {
      copyrightClicks += 1;
      clearTimeout(copyrightClickTimer);
      copyrightClickTimer = setTimeout(() => { copyrightClicks = 0; }, 1500);
      if (copyrightClicks >= 4) {
        copyrightClicks = 0;
        triggerHackerEasterEgg(4200);
      }
    });
  }

  // Метель на аватарке
  const mainAvatar = document.getElementById('main-avatar');
  const blizzardBadge = document.getElementById('blizzard-badge');
  let avatarClickCount = 0;
  let avatarClickResetTimer = null;
  let blizzardTargetIntensity = 0;
  let blizzardCurrentIntensity = 0;

  function startBlizzard() {
    blizzardTargetIntensity = 1;
    document.body.classList.add('blizzard-active');
    if (blizzardBadge) blizzardBadge.classList.add('visible');
  }

  function stopBlizzard() {
    if (blizzardTargetIntensity === 0 && blizzardCurrentIntensity < 0.01) return;
    blizzardTargetIntensity = 0;
    document.body.classList.remove('blizzard-active');
    if (blizzardBadge) blizzardBadge.classList.remove('visible');
  }

  if (mainAvatar) {
    mainAvatar.addEventListener('click', () => {
      avatarClickCount += 1;
      clearTimeout(avatarClickResetTimer);
      avatarClickResetTimer = setTimeout(() => { avatarClickCount = 0; }, 1800);
      if (avatarClickCount >= 5) {
        avatarClickCount = 0;
        startBlizzard();
      }
    });
  }
  if (blizzardBadge) blizzardBadge.addEventListener('click', stopBlizzard);

  // Переключение вкладок + пружинный отклик + реакция снега
  let onTabSwitchedEffect = null;
  const tabPanels = [
    document.getElementById('tab-profile'),
    document.getElementById('tab-dino'),
    document.getElementById('tab-lofi')
  ];
  const tabDots = document.querySelectorAll('.tab-dot');
  const wheelHint = document.getElementById('wheel-hint');
  let activeTabIndex = 0;
  let lastWheelSwitchTime = 0;

  function triggerTabSpring(direction) {
    const activePanel = tabPanels[activeTabIndex];
    if (!activePanel) return;
    activePanel.style.setProperty('--spring-y', `${direction > 0 ? 12 : -12}px`);
    requestAnimationFrame(() => {
      activePanel.style.setProperty('--spring-y', '0px');
    });
  }

  function switchTab(nextIndex, direction = 1) {
    const total = tabPanels.length;
    const normalized = ((nextIndex % total) + total) % total;
    if (normalized === activeTabIndex) return;
    activeTabIndex = normalized;

    tabPanels.forEach((panel, idx) => panel.classList.toggle('active', idx === activeTabIndex));
    tabDots.forEach((dot, idx) => dot.classList.toggle('active', idx === activeTabIndex));
    triggerTabSpring(direction);

    if (wheelHint && !wheelHint.classList.contains('dismissed')) {
      wheelHint.classList.add('dismissed');
    }
    if (activeTabIndex === 1) resizeDinoCanvas();
    if (typeof onTabSwitchedEffect === 'function') onTabSwitchedEffect(activeTabIndex);
  }

  tabDots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const targetIdx = parseInt(dot.getAttribute('data-tab') || '0', 10);
      switchTab(targetIdx, targetIdx > activeTabIndex ? 1 : -1);
    });
  });

  window.addEventListener('wheel', (e) => {
    if (!isEntered || Math.abs(e.deltaY) < 12) return;
    const now = Date.now();
    if (now - lastWheelSwitchTime < 460) return;
    lastWheelSwitchTime = now;
    const dir = e.deltaY > 0 ? 1 : -1;
    switchTab(activeTabIndex + dir, dir);
  }, { passive: true });

  let touchStartY = null;
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (!isEntered || touchStartY === null || e.changedTouches.length === 0) return;
    const diffY = touchStartY - e.changedTouches[0].clientY;
    touchStartY = null;
    if (Math.abs(diffY) > 55) {
      const dir = diffY > 0 ? 1 : -1;
      switchTab(activeTabIndex + dir, dir);
    }
  }, { passive: true });

  // Мини-игра Dino Run
  const dinoCard = document.getElementById('dino-card');
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dinoW = Math.max(260, Math.floor(rect.width || 380));
    dinoH = Math.max(150, Math.floor(rect.height || 175));
    dinoCanvas.width = Math.floor(dinoW * dpr);
    dinoCanvas.height = Math.floor(dinoH * dpr);
    dinoCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeDinoCanvas();
  window.addEventListener('resize', resizeDinoCanvas);

  function triggerDinoCardEffect(className, durationMs = 260) {
    if (!dinoCard) return;
    dinoCard.classList.remove(className);
    void dinoCard.offsetWidth;
    dinoCard.classList.add(className);
    setTimeout(() => dinoCard.classList.remove(className), durationMs);
  }

  let sfxCtx = null;
  function playDinoSound(type) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!sfxCtx) sfxCtx = new AudioContextClass();
      if (sfxCtx.state === 'suspended') sfxCtx.resume().catch(() => {});
      const osc = sfxCtx.createOscillator();
      const gain = sfxCtx.createGain();
      osc.type = type === 'hit' ? 'sawtooth' : 'square';
      const now = sfxCtx.currentTime;
      if (type === 'jump') {
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(560, now + 0.09);
        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      } else if (type === 'milestone') {
        osc.frequency.setValueAtTime(587, now);
        osc.frequency.setValueAtTime(880, now + 0.07);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      } else {
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.22);
        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
      }
      osc.connect(gain);
      gain.connect(sfxCtx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
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
    beatRecordThisRun: false,
    speed: 4.5,
    groundScroll: 0,
    nextSpawnFrames: 60,
    nightFactor: 0,
    player: { x: 42, y: 0, w: 22, h: 26, vy: 0, grounded: true, ducking: false },
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
    dinoState.beatRecordThisRun = false;
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
    dinoState.player.ducking = isDucking;
    if (!dinoState.player.grounded && isDucking) {
      dinoState.player.vy = Math.max(dinoState.player.vy, 7.5);
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
      dinoTouchHoldTimer = setTimeout(() => setDinoDuck(true), 170);
    }
    triggerDinoJump();
  });

  dinoStage.addEventListener('pointerup', () => { clearTimeout(dinoTouchHoldTimer); setDinoDuck(false); });
  dinoStage.addEventListener('pointercancel', () => { clearTimeout(dinoTouchHoldTimer); setDinoDuck(false); });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q' || e.key === 'й' || e.key === 'Й') {
      if (blizzardTargetIntensity > 0 || blizzardCurrentIntensity > 0.05) stopBlizzard();
    }
    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      typedSecretBuffer = (typedSecretBuffer + e.key.toLowerCase()).slice(-8);
      if (typedSecretBuffer.endsWith('hack')) {
        typedSecretBuffer = '';
        triggerHackerEasterEgg(4200);
      }
    }
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
    if (e.code === 'ArrowDown' || e.code === 'KeyS') setDinoDuck(false);
  });

  function drawDinoCharacter(p, timeMs) {
    dinoCtx.save();
    dinoCtx.fillStyle = '#f3f4f6';
    if (p.ducking && p.grounded) {
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
    dinoCtx.restore();
  }

  function drawBird(b, timeMs) {
    dinoCtx.save();
    const flap = Math.sin(timeMs * 0.022 + b.phase) > 0;
    dinoCtx.fillStyle = '#9ca3af';
    dinoCtx.beginPath();
    dinoCtx.roundRect(b.x + 4, b.y + 6, b.w - 8, 7, 3);
    dinoCtx.fill();
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
    const isNightTarget = Math.floor(dinoState.score / 250) % 2 === 1 ? 1 : 0;
    dinoState.nightFactor += (isNightTarget - dinoState.nightFactor) * 0.03;

    if (dinoState.nightFactor > 0.02) {
      dinoCtx.save();
      dinoCtx.fillStyle = `rgba(15, 23, 42, ${dinoState.nightFactor * 0.48})`;
      dinoCtx.fillRect(0, 0, dinoW, dinoH);
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
    p.h = p.ducking && p.grounded ? 16 : 26;
    if (!dinoState.running && !dinoState.gameOver) p.y = groundY - p.h;

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
    }

    if (dinoState.running && !dinoState.gameOver) {
      const wasAirborne = !p.grounded;
      p.vy += 0.45;
      p.y += p.vy;
      if (p.y >= groundY - p.h) {
        p.y = groundY - p.h;
        p.vy = 0;
        p.grounded = true;
        if (wasAirborne) spawnDinoDust(p.x + 6, groundY, 5);
      }

      dinoState.nextSpawnFrames -= 1;
      if (dinoState.nextSpawnFrames <= 0) {
        const canSpawnBird = dinoState.score >= 120 && Math.random() < 0.3;
        if (canSpawnBird) {
          dinoState.obstacles.push({
            kind: 'bird',
            x: dinoW + 14,
            y: Math.random() < 0.55 ? groundY - 34 : groundY - 21,
            w: 24,
            h: 18,
            phase: Math.random() * Math.PI * 2
          });
        } else {
          const isDouble = dinoState.score >= 80 && Math.random() < 0.28;
          const h = 22 + Math.floor(Math.random() * 13);
          dinoState.obstacles.push({
            kind: 'cactus',
            x: dinoW + 12,
            y: groundY - h,
            w: isDouble ? 25 : (14 + Math.floor(Math.random() * 6)),
            h
          });
        }
        dinoState.nextSpawnFrames = Math.max(42, Math.floor(70 + Math.random() * 45 - dinoState.speed * 2));
      }

      for (let i = dinoState.obstacles.length - 1; i >= 0; i--) {
        const ob = dinoState.obstacles[i];
        ob.x -= ob.kind === 'bird' ? dinoState.speed * 1.12 : dinoState.speed;
        const pad = 4;
        const playerRight = p.ducking && p.grounded ? p.x + p.w + 5 : p.x + p.w;
        if (
          p.x + pad < ob.x + ob.w - pad &&
          playerRight - pad > ob.x + pad &&
          p.y + pad < ob.y + ob.h - pad &&
          p.y + p.h - pad > ob.y + pad
        ) {
          dinoState.gameOver = true;
          dinoState.running = false;
          playDinoSound('hit');
          triggerDinoCardEffect('hit-shake', 250);
          const finalScore = Math.floor(dinoState.score);
          if (finalScore > dinoBest) {
            dinoBest = finalScore;
            localStorage.setItem(DINO_BEST_KEY, String(dinoBest));
            dinoBestEl.textContent = String(dinoBest).padStart(4, '0');
            if (dinoState.beatRecordThisRun) {
              triggerDinoCardEffect('record-flash', 420);
            }
          }
          dinoMsgTitle.textContent = `Игра окончена · Счёт: ${finalScore}`;
          dinoMsgSub.textContent = isMobileDevice ? 'Тапни по экрану, чтобы сыграть снова' : 'Нажми Space или кликни, чтобы сыграть снова';
          dinoOverlayMsg.classList.remove('hidden-msg');
        }
        if (ob.x + ob.w < -15) dinoState.obstacles.splice(i, 1);
      }

      dinoState.score += 0.17;
      const wholeScore = Math.floor(dinoState.score);
      if (dinoBest > 0 && wholeScore > dinoBest && !dinoState.beatRecordThisRun) {
        dinoState.beatRecordThisRun = true;
        triggerDinoCardEffect('record-flash', 400);
      }
      if (wholeScore > 0 && wholeScore % 100 === 0 && wholeScore !== dinoState.lastMilestone) {
        dinoState.lastMilestone = wholeScore;
        playDinoSound('milestone');
      }
      dinoState.speed = Math.min(9.2, 4.5 + dinoState.score * 0.0048);
      dinoScoreEl.textContent = String(wholeScore).padStart(4, '0');
    }

    for (let i = dinoState.dust.length - 1; i >= 0; i--) {
      const d = dinoState.dust[i];
      d.x += d.vx;
      d.y += d.vy;
      d.alpha -= 0.04;
      if (d.alpha <= 0) dinoState.dust.splice(i, 1);
      else {
        dinoCtx.fillStyle = `rgba(229, 231, 235, ${d.alpha})`;
        dinoCtx.fillRect(d.x, d.y, d.size, d.size);
      }
    }

    for (let i = 0; i < dinoState.obstacles.length; i++) {
      const ob = dinoState.obstacles[i];
      if (ob.kind === 'bird') drawBird(ob, timeMs);
      else drawCactus(ob);
    }
    drawDinoCharacter(p, timeMs);
  }

  // Сбоящий виниловый диск на 3-й вкладке
  const lofiCard = document.querySelector('.lofi-card');
  const vinylDisc = document.getElementById('vinyl-disc');
  const discStatusLabel = document.getElementById('disc-status-label');
  let discAngle = 0;
  let lastDiscFrameMs = null;
  let glitchState = 'none';
  let glitchUntilMs = 0;
  let nextGlitchCheckMs = 0;

  function stepAndRenderVinylDisc(timeMs) {
    if (!vinylDisc) return;
    if (lastDiscFrameMs === null) lastDiscFrameMs = timeMs;
    const dt = Math.min(0.05, Math.max(0, (timeMs - lastDiscFrameMs) / 1000));
    lastDiscFrameMs = timeMs;

    if (timeMs >= nextGlitchCheckMs) {
      if (glitchState === 'none') {
        const roll = Math.random();
        if (roll < 0.24) {
          glitchState = 'stall';
          glitchUntilMs = timeMs + 260 + Math.random() * 520;
          if (discStatusLabel) discStatusLabel.textContent = 'GLITCH · STALL';
        } else if (roll < 0.38) {
          glitchState = 'rewind';
          glitchUntilMs = timeMs + 180 + Math.random() * 240;
          if (discStatusLabel) discStatusLabel.textContent = 'GLITCH · SKIP BACK';
        } else if (roll < 0.50) {
          glitchState = 'jitter';
          glitchUntilMs = timeMs + 220 + Math.random() * 320;
          if (discStatusLabel) discStatusLabel.textContent = 'GLITCH · WOBBLE';
        } else {
          nextGlitchCheckMs = timeMs + 1000 + Math.random() * 1600;
        }
      } else if (timeMs >= glitchUntilMs) {
        glitchState = 'none';
        nextGlitchCheckMs = timeMs + 1200 + Math.random() * 2000;
        if (discStatusLabel) discStatusLabel.textContent = 'SPINNING · LO-FI';
      }
    }

    if (lofiCard) lofiCard.classList.toggle('is-glitching', glitchState !== 'none');

    let offsetX = 0;
    let offsetY = 0;
    let scale = 1;

    if (glitchState === 'none') {
      discAngle = (discAngle + dt * 135) % 360;
    } else if (glitchState === 'stall') {
      discAngle = (discAngle + dt * 6) % 360;
      offsetX = (Math.random() - 0.5) * 2.2;
      offsetY = (Math.random() - 0.5) * 2.2;
    } else if (glitchState === 'rewind') {
      discAngle = (discAngle - dt * 290 + 360) % 360;
      offsetX = (Math.random() - 0.5) * 3.5;
      scale = 0.985;
    } else if (glitchState === 'jitter') {
      discAngle = (discAngle + dt * (Math.random() < 0.5 ? 360 : 25)) % 360;
      offsetX = (Math.random() - 0.5) * 3;
      offsetY = (Math.random() - 0.5) * 2.5;
    }

    vinylDisc.style.transform = `translate3d(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px, 0) scale(${scale}) rotate(${discAngle.toFixed(1)}deg)`;
  }

  // Перетаскивание проигрывателя
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
    return {
      x: Math.max(margin, Math.min(x, Math.max(margin, window.innerWidth - rect.width - margin))),
      y: Math.max(margin, Math.min(y, Math.max(margin, window.innerHeight - rect.height - margin)))
    };
  }

  topPlayer.addEventListener('pointerdown', (e) => {
    if (isMobileDevice || e.target.closest('button, input, .progress-track-wrap, .volume-drawer')) return;
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
    const clamped = clampPlayerPosition(e.clientX - playerDragOffsetX, e.clientY - playerDragOffsetY);
    targetPlayerX = clamped.x;
    targetPlayerY = clamped.y;
  });

  function stopPlayerDrag(e) {
    if (!isPlayerDragging) return;
    isPlayerDragging = false;
    topPlayer.classList.remove('dragging');
    if (topPlayer.hasPointerCapture(e.pointerId)) topPlayer.releasePointerCapture(e.pointerId);
  }
  topPlayer.addEventListener('pointerup', stopPlayerDrag);
  topPlayer.addEventListener('pointercancel', stopPlayerDrag);

  // CAVA эквалайзер + реакция басов на тему/фон
  const cavaCanvas = document.getElementById('cava-canvas');
  const cavaCtx = cavaCanvas.getContext('2d');
  const CAVA_BARS = 8;
  const cavaLevels = new Array(CAVA_BARS).fill(0.15);
  let smoothBass = 0;

  function renderCavaBars(timeMs) {
    const w = cavaCanvas.width;
    const h = cavaCanvas.height;
    cavaCtx.clearRect(0, 0, w, h);
    const playingNow = isAnyPlaying() && !syncMuteIsMuted();
    let hasRealAudio = false;
    let bassRaw = 0;

    if (useLocalFallback && analyser && freqData && playingNow) {
      analyser.getByteFrequencyData(freqData);
      for (let i = 0; i < freqData.length; i++) {
        if (freqData[i] > 6) { hasRealAudio = true; break; }
      }
      if (hasRealAudio) {
        bassRaw = Math.min(1, ((freqData[1] + freqData[2] + freqData[3]) / (3 * 255)) * 1.4);
      }
    }

    if (playingNow && !hasRealAudio) {
      bassRaw = 0.35 + 0.35 * Math.sin(timeMs * 0.008);
    }
    smoothBass += (bassRaw - smoothBass) * 0.16;
    document.body.style.setProperty('--bass-energy', smoothBass.toFixed(3));

    const styles = getComputedStyle(document.body);
    const c1 = styles.getPropertyValue('--accent-1').trim() || '#38bdf8';
    const c2 = styles.getPropertyValue('--accent-2').trim() || '#818cf8';
    const c3 = styles.getPropertyValue('--accent-3').trim() || '#f472b6';

    const gap = 2;
    const barWidth = Math.max(2, (w - gap * (CAVA_BARS - 1)) / CAVA_BARS);
    for (let i = 0; i < CAVA_BARS; i++) {
      let targetLevel = 0.14;
      if (playingNow) {
        if (hasRealAudio && freqData) {
          const binIndex = Math.min(freqData.length - 1, Math.floor((i / CAVA_BARS) * 18) + 1);
          targetLevel = Math.max(0.16, Math.min(1, (freqData[binIndex] / 255) * 1.25));
        } else {
          const wave1 = Math.sin(timeMs * 0.0085 + i * 0.75) * 0.5 + 0.5;
          const wave2 = Math.cos(timeMs * 0.013 - i * 1.1) * 0.5 + 0.5;
          targetLevel = Math.max(0.18, Math.min(0.96, wave1 * 0.62 + wave2 * 0.34));
        }
      }
      cavaLevels[i] += (targetLevel - cavaLevels[i]) * (playingNow ? 0.26 : 0.14);
      const barHeight = Math.max(3, cavaLevels[i] * (h - 2));
      const x = i * (barWidth + gap);
      const y = h - barHeight;
      const grad = cavaCtx.createLinearGradient(0, y, 0, h);
      grad.addColorStop(0, c1);
      grad.addColorStop(0.55, c2);
      grad.addColorStop(1, c3);
      cavaCtx.fillStyle = grad;
      cavaCtx.beginPath();
      cavaCtx.roundRect(x, y, barWidth, barHeight, 2);
      cavaCtx.fill();
    }
  }

  function syncMuteIsMuted() {
    return useLocalFallback ? (audio.muted || audio.volume <= 0.025) : (parseFloat(volumeSlider.value) <= 0.025);
  }

  let volumeCloseTimer = null;
  let isVolumeDragging = false;
  function openVolumeDrawer() {
    clearTimeout(volumeCloseTimer);
    volumeControl.classList.add('open');
    resizeVolCanvas();
  }
  function scheduleCloseVolumeDrawer() {
    clearTimeout(volumeCloseTimer);
    volumeCloseTimer = setTimeout(() => { if (!isVolumeDragging) volumeControl.classList.remove('open'); }, 340);
  }
  volumeControl.addEventListener('mouseenter', openVolumeDrawer);
  volumeControl.addEventListener('mouseleave', scheduleCloseVolumeDrawer);

  playPauseBtn.addEventListener('click', () => {
    if (isAnyPlaying()) pausePlayback();
    else startPlayback();
  });

  muteBtn.addEventListener('click', () => {
    if (!isMobileDevice) openVolumeDrawer();
    if (syncMuteIsMuted()) applyVolumeValue(lastNonZeroVolume > 0.05 ? lastNonZeroVolume : 0.75);
    else { lastNonZeroVolume = parseFloat(volumeSlider.value) || 0.75; applyVolumeValue(0); }
  });

  volumeSlider.addEventListener('input', () => { openVolumeDrawer(); applyVolumeValue(parseFloat(volumeSlider.value)); });
  volumeSlider.addEventListener('pointerdown', (e) => {
    isVolumeDragging = true;
    openVolumeDrawer();
    volumeSlider.setPointerCapture(e.pointerId);
    const rect = volumeSlider.getBoundingClientRect();
    if (rect.width > 0) applyVolumeValue((e.clientX - rect.left) / rect.width);
  });
  volumeSlider.addEventListener('pointermove', (e) => {
    if (!isVolumeDragging) return;
    const rect = volumeSlider.getBoundingClientRect();
    if (rect.width > 0) applyVolumeValue((e.clientX - rect.left) / rect.width);
  });
  function stopVolumeDrag(e) {
    if (!isVolumeDragging) return;
    isVolumeDragging = false;
    if (volumeSlider.hasPointerCapture(e.pointerId)) volumeSlider.releasePointerCapture(e.pointerId);
    scheduleCloseVolumeDrawer();
  }
  volumeSlider.addEventListener('pointerup', stopVolumeDrag);
  volumeSlider.addEventListener('pointercancel', stopVolumeDrag);

  audio.addEventListener('play', syncPlayState);
  audio.addEventListener('pause', syncPlayState);
  audio.addEventListener('ended', () => { audio.currentTime = 0; targetProgressPercent = 0; syncPlayState(); });
  audio.addEventListener('loadedmetadata', () => {
    if (useLocalFallback) durationTimeEl.textContent = formatTime(audio.duration);
  });

  let isScrubbing = false;
  function setSeekFromClientX(clientX, immediateVisual = false) {
    const rect = seekSlider.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    targetProgressPercent = pct;
    if (immediateVisual) {
      smoothProgressPercent = pct;
      progressFill.style.width = `${pct.toFixed(3)}%`;
    }
    seekSlider.value = pct;
    if (!useLocalFallback && scWidget && scReady && scDurationMs > 0) {
      const targetMs = (pct / 100) * scDurationMs;
      scWidget.seekTo(targetMs);
      currentTimeEl.textContent = formatTime(targetMs / 1000);
    } else if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (pct / 100) * audio.duration;
      currentTimeEl.textContent = formatTime(audio.currentTime);
    }
  }

  audio.addEventListener('timeupdate', () => {
    if (!useLocalFallback || isScrubbing) return;
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
    if (!useLocalFallback && scWidget && scReady && scDurationMs > 0) {
      const targetMs = (pct / 100) * scDurationMs;
      scWidget.seekTo(targetMs);
      currentTimeEl.textContent = formatTime(targetMs / 1000);
    } else if (Number.isFinite(audio.duration) && audio.duration > 0) {
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
    if (seekSlider.hasPointerCapture(e.pointerId)) seekSlider.releasePointerCapture(e.pointerId);
  }
  seekSlider.addEventListener('pointerup', endScrub);
  seekSlider.addEventListener('pointercancel', endScrub);

  document.querySelectorAll('.tilt-btn').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      if (isMobileDevice) return;
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--rx', `${(-((e.clientY - rect.top) / rect.height - 0.5) * 14).toFixed(2)}deg`);
      btn.style.setProperty('--ry', `${(((e.clientX - rect.left) / rect.width - 0.5) * 14).toFixed(2)}deg`);
      btn.style.setProperty('--ty', '-3px');
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.setProperty('--rx', '0deg');
      btn.style.setProperty('--ry', '0deg');
      btn.style.setProperty('--ty', '0px');
    });
  });

  const pCanvas = document.getElementById('progress-particles');
  const pCtx = pCanvas.getContext('2d');
  const barParticles = [];
  const vCanvas = document.getElementById('volume-particles');
  const vCtx = vCanvas.getContext('2d');
  const volParticles = [];

  function resizeBarCanvas() {
    const rect = pCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    pCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
    pCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
    pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function resizeVolCanvas() {
    const rect = vCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    vCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
    vCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
    vCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeBarCanvas();
  resizeVolCanvas();
  window.addEventListener('resize', () => { resizeBarCanvas(); resizeVolCanvas(); });

  const particleColors = ['#38bdf8', '#818cf8', '#f472b6', '#ffffff'];
  function spawnProgressParticles(count = 1, boosting = false) {
    const rect = pCanvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const thumbX = 10 + Math.max(1, rect.width - 20) * (smoothProgressPercent / 100);
    const centerY = rect.height / 2;
    for (let i = 0; i < count; i++) {
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      const angle = Math.random() * Math.PI * 2;
      const speed = boosting ? (Math.random() * 1.1 + 0.35) : (Math.random() * 0.45 + 0.12);
      barParticles.push({
        x: thumbX + (Math.random() - 0.5) * (boosting ? 12 : 6),
        y: centerY + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.15,
        size: Math.random() * 2 + 1,
        alpha: 0.95,
        decay: 0.02,
        color
      });
    }
  }

  function spawnVolumeBurst(count = 2) {
    const rect = vCanvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const xPos = ((rect.width - 18) * (smoothVolumePercent / 100)) + 9;
    for (let i = 0; i < count; i++) {
      volParticles.push({
        x: xPos + (Math.random() - 0.5) * 6,
        y: rect.height / 2,
        vx: (Math.random() - 0.5) * 0.85,
        vy: (Math.random() - 0.5) * 0.9 - 0.2,
        size: Math.random() * 1.8 + 0.9,
        alpha: 0.95,
        decay: 0.022,
        color: particleColors[Math.floor(Math.random() * particleColors.length)]
      });
    }
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
    if (activeTabIndex === 1) stepAndRenderDino(timeMs);
    else if (activeTabIndex === 2) stepAndRenderVinylDisc(timeMs);

    smoothProgressPercent += (targetProgressPercent - smoothProgressPercent) * (isScrubbing ? 0.65 : 0.18);
    progressFill.style.width = `${smoothProgressPercent.toFixed(3)}%`;

    smoothVolumePercent += (targetVolumePercent - smoothVolumePercent) * (isVolumeDragging ? 0.35 : 0.15);
    volumeFill.style.width = `${smoothVolumePercent.toFixed(3)}%`;
    volumeThumb.style.left = `${smoothVolumePercent.toFixed(3)}%`;

    const pRect = pCanvas.getBoundingClientRect();
    pCtx.clearRect(0, 0, pRect.width, pRect.height);
    if (isScrubbing) spawnProgressParticles(3, true);
    else if (isAnyPlaying() && Math.random() < 0.75) spawnProgressParticles(1, false);

    for (let i = barParticles.length - 1; i >= 0; i--) {
      const pt = barParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= pt.decay;
      if (pt.alpha <= 0) barParticles.splice(i, 1);
      else {
        pCtx.save();
        pCtx.globalAlpha = pt.alpha;
        pCtx.fillStyle = pt.color;
        pCtx.beginPath();
        pCtx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        pCtx.fill();
        pCtx.restore();
      }
    }

    const vRect = vCanvas.getBoundingClientRect();
    vCtx.clearRect(0, 0, vRect.width, vRect.height);
    for (let i = volParticles.length - 1; i >= 0; i--) {
      const vp = volParticles[i];
      vp.x += vp.vx;
      vp.y += vp.vy;
      vp.alpha -= vp.decay;
      if (vp.alpha <= 0) volParticles.splice(i, 1);
      else {
        vCtx.save();
        vCtx.globalAlpha = vp.alpha;
        vCtx.fillStyle = vp.color;
        vCtx.beginPath();
        vCtx.arc(vp.x, vp.y, vp.size, 0, Math.PI * 2);
        vCtx.fill();
        vCtx.restore();
      }
    }
    requestAnimationFrame(renderSlidersAndParticles);
  }
  requestAnimationFrame(renderSlidersAndParticles);

  // Оптимизированный снег + метель + снежинки за курсором
  const canvas = document.getElementById('snow-canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  let viewWidth = window.innerWidth;
  let viewHeight = window.innerHeight;
  let snowDpr = Math.min(window.devicePixelRatio || 1, 1.5);

  function resizeSnowCanvas() {
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;
    snowDpr = Math.min(window.devicePixelRatio || 1, isMobileDevice ? 1.25 : 1.5);
    canvas.width = Math.floor(viewWidth * snowDpr);
    canvas.height = Math.floor(viewHeight * snowDpr);
    ctx.setTransform(snowDpr, 0, 0, snowDpr, 0, 0);
  }
  resizeSnowCanvas();
  window.addEventListener('resize', resizeSnowCanvas);

  const ambientSnow = [];
  const blizzardSnow = [];
  const cursorSnow = [];
  const BASE_AMBIENT_COUNT = isMobileDevice ? 55 : 80;
  const MAX_BLIZZARD_COUNT = isMobileDevice ? 85 : 145;
  const MAX_CURSOR_SNOW = 90;

  const TAB_SNOW_DENSITY = [1.0, 1.25, 0.75];
  let tabDensityTarget = TAB_SNOW_DENSITY[0];
  let tabDensityCurrent = TAB_SNOW_DENSITY[0];
  let tabGustBoost = 0;

  onTabSwitchedEffect = (tabIdx) => {
    tabDensityTarget = TAB_SNOW_DENSITY[tabIdx] ?? 1.0;
    tabGustBoost = 1.0;
    spawnProgressParticles(6, true);
    const burstCount = isMobileDevice ? 8 : 14;
    for (let i = 0; i < burstCount; i++) {
      if (cursorSnow.length >= MAX_CURSOR_SNOW) cursorSnow.shift();
      const angle = Math.random() * Math.PI * 2;
      const spd = 1.1 + Math.random() * 2.1;
      cursorSnow.push({
        x: viewWidth * 0.5 + (Math.random() - 0.5) * 80,
        y: viewHeight * 0.45 + (Math.random() - 0.5) * 80,
        speedX: Math.cos(angle) * spd + 1.0,
        speedY: Math.sin(angle) * spd + 0.5,
        radius: Math.random() * 2.1 + 0.9,
        opacity: 0.85,
        decay: Math.random() * 0.018 + 0.015,
        swirl: (Math.random() - 0.5) * 0.07
      });
    }
  };

  for (let i = 0; i < BASE_AMBIENT_COUNT; i++) {
    ambientSnow.push({
      x: Math.random() * viewWidth,
      y: Math.random() * viewHeight,
      radius: Math.random() * 2.2 + 0.8,
      speedY: Math.random() * 0.85 + 0.35,
      speedX: (Math.random() - 0.5) * 0.4,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: Math.random() * 0.02 + 0.008,
      opacity: Math.random() * 0.48 + 0.16
    });
  }

  function resetBlizzardFlake(bf, initialScatter = false) {
    bf.x = initialScatter
      ? Math.random() * viewWidth
      : (Math.random() < 0.65 ? Math.random() * (viewWidth + 160) - 80 : -12);
    bf.y = initialScatter
      ? Math.random() * viewHeight
      : (bf.x < 0 ? Math.random() * viewHeight : -10);
    bf.radius = Math.random() * 2.2 + 0.85;
    bf.speedY = Math.random() * 3.4 + 2.0;
    bf.speedX = Math.random() * 4.0 + 2.2;
    bf.swirlPhase = Math.random() * Math.PI * 2;
    bf.swirlSpeed = Math.random() * 0.055 + 0.022;
    bf.opacity = Math.random() * 0.6 + 0.24;
  }

  function spawnBlizzardFlake() {
    const bf = {};
    resetBlizzardFlake(bf, false);
    blizzardSnow.push(bf);
  }

  let lastCursorSpawnMs = 0;
  function spawnCursorFlakes(x, y, force = false) {
    const now = performance.now();
    if (!force && now - lastCursorSpawnMs < 22) return;
    lastCursorSpawnMs = now;

    const isBlizzard = blizzardCurrentIntensity > 0.15;
    const count = isBlizzard ? Math.min(5, Math.round(2 + blizzardCurrentIntensity * 3)) : 2;
    for (let i = 0; i < count; i++) {
      if (cursorSnow.length >= MAX_CURSOR_SNOW) cursorSnow.shift();
      cursorSnow.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 14,
        radius: Math.random() * 2.3 + 1.0,
        speedX: isBlizzard ? (2.0 + Math.random() * 3.0) : ((Math.random() - 0.5) * 1.3),
        speedY: isBlizzard ? (1.6 + Math.random() * 2.1) : (Math.random() * 1.1 + 0.45),
        opacity: 0.92,
        decay: Math.random() * 0.017 + 0.014,
        swirl: isBlizzard ? (Math.random() - 0.5) * 0.14 : 0
      });
    }
  }

  window.addEventListener('mousemove', (e) => spawnCursorFlakes(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) spawnCursorFlakes(e.touches[0].clientX, e.touches[0].clientY, true);
  }, { passive: true });

  function drawFlake(x, y, radius, opacity, stretchX = 0, stretchY = 0) {
    if (opacity <= 0.01) return;
    ctx.beginPath();
    if (Math.abs(stretchX) > 0.45 || Math.abs(stretchY) > 0.45) {
      ctx.moveTo(x - stretchX, y - stretchY);
      ctx.lineTo(x + stretchX, y + stretchY);
      ctx.strokeStyle = `rgba(255,255,255,${opacity.toFixed(3)})`;
      ctx.lineWidth = radius * 1.1;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else {
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${opacity.toFixed(3)})`;
      ctx.fill();
    }
  }

  function animate(timeMs = 0) {
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    blizzardCurrentIntensity += (blizzardTargetIntensity - blizzardCurrentIntensity) * 0.025;
    if (blizzardTargetIntensity === 0 && blizzardCurrentIntensity < 0.004) blizzardCurrentIntensity = 0;

    tabDensityCurrent += (tabDensityTarget - tabDensityCurrent) * 0.04;
    tabGustBoost *= 0.94;

    const windBoostX = blizzardCurrentIntensity * 4.0 + tabGustBoost * 2.0;
    const windBoostY = 1 + blizzardCurrentIntensity * 2.2 + tabGustBoost * 0.85;
    const activeAmbientCount = Math.max(25, Math.min(ambientSnow.length, Math.round(BASE_AMBIENT_COUNT * tabDensityCurrent)));
    const streak = blizzardCurrentIntensity * 2.0 + tabGustBoost * 1.0;

    for (let i = 0; i < activeAmbientCount; i++) {
      const f = ambientSnow[i];
      f.swayPhase += f.swaySpeed;
      f.y += f.speedY * windBoostY;
      f.x += f.speedX + windBoostX + Math.sin(f.swayPhase) * 0.28;
      if (f.y > viewHeight + 10) { f.y = -8; f.x = Math.random() * viewWidth; }
      if (f.x > viewWidth + 10) f.x = -8;
      if (f.x < -10) f.x = viewWidth + 8;
      drawFlake(f.x, f.y, f.radius, f.opacity, streak, streak * 0.65);
    }

    const desiredBlizzardCount = Math.floor(MAX_BLIZZARD_COUNT * blizzardCurrentIntensity);
    while (blizzardSnow.length < desiredBlizzardCount) spawnBlizzardFlake();

    const blizzardStreakX = 2.6 * blizzardCurrentIntensity;
    const blizzardStreakY = 1.9 * blizzardCurrentIntensity;
    const activeBlizzardFactor = Math.max(0.25, blizzardCurrentIntensity);

    for (let i = blizzardSnow.length - 1; i >= 0; i--) {
      const bf = blizzardSnow[i];
      bf.swirlPhase += bf.swirlSpeed;
      bf.x += (bf.speedX + Math.cos(bf.swirlPhase) * 1.0) * activeBlizzardFactor;
      bf.y += (bf.speedY + Math.sin(bf.swirlPhase) * 0.65) * activeBlizzardFactor;
      if (blizzardTargetIntensity === 0) bf.opacity -= 0.012;

      if (bf.opacity <= 0.01 || bf.y > viewHeight + 18 || bf.x > viewWidth + 32) {
        if (i >= desiredBlizzardCount || bf.opacity <= 0.01) {
          blizzardSnow.splice(i, 1);
          continue;
        }
        resetBlizzardFlake(bf, false);
      }
      drawFlake(
        bf.x,
        bf.y,
        bf.radius,
        bf.opacity * Math.min(1, blizzardCurrentIntensity * 1.3),
        blizzardStreakX,
        blizzardStreakY
      );
    }

    for (let i = cursorSnow.length - 1; i >= 0; i--) {
      const p = cursorSnow[i];
      if (p.swirl) p.speedY += Math.sin(timeMs * 0.01 + i) * p.swirl;
      p.x += p.speedX;
      p.y += p.speedY;
      p.opacity -= p.decay;
      if (p.opacity <= 0) cursorSnow.splice(i, 1);
      else drawFlake(p.x, p.y, p.radius, p.opacity);
    }

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
});