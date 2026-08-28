(() => {
  'use strict';

  const stage = document.getElementById('travelerStage');
  const fireBody = document.getElementById('fireBody');
  const caption = document.getElementById('stageCaption');
  if (!stage) return;

  const fireFrames = [
    'assets/fire/fire_01.webp',
    'assets/fire/fire_02.webp',
    'assets/fire/fire_03.webp'
  ];
  const weatherIds = new Set(['clear', 'cloudy', 'wind', 'light_rain']);
  let frameIndex = 0;
  let fireMode = 'normal';
  let fireTimer = null;

  const assets = [
    ...Object.values({
      idle: 'assets/characters/character_idle.webp',
      thinking: 'assets/characters/character_thinking.webp',
      smile: 'assets/characters/character_smile.webp',
      sit: 'assets/characters/character_sit.webp',
      harmonica: 'assets/characters/character_harmonica.webp'
    }),
    ...fireFrames,
    'assets/fire/fire_low.webp'
  ];

  function getTimeBand(date = new Date()) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 17) return 'day';
    if (hour >= 17 && hour < 20) return 'dusk';
    return 'night';
  }

  function updateTime() {
    stage.dataset.time = getTimeBand();
  }

  function tickFire() {
    if (!fireBody || fireMode === 'low') return;
    frameIndex = (frameIndex + 1) % fireFrames.length;
    fireBody.src = fireFrames[frameIndex];
  }

  function startFire() {
    clearInterval(fireTimer);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    fireTimer = window.setInterval(tickFire, 580);
  }

  function setFireMode(mode) {
    fireMode = mode === 'low' ? 'low' : 'normal';
    stage.dataset.fire = fireMode;
    if (fireBody) fireBody.src = fireMode === 'low' ? 'assets/fire/fire_low.webp' : fireFrames[frameIndex];
  }

  function setWeather(weather) {
    stage.dataset.weather = weatherIds.has(weather) ? weather : 'clear';
  }

  function setCaption(text) {
    if (caption) caption.textContent = String(text || '');
  }

  assets.forEach((src) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
  });

  updateTime();
  setWeather('clear');
  setFireMode('normal');
  startFire();
  window.setInterval(updateTime, 60000);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(fireTimer);
    else {
      updateTime();
      startFire();
    }
  });

  window.SniffScene = Object.freeze({ getTimeBand, setCaption, setFireMode, setWeather, updateTime });
})();
