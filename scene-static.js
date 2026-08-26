(() => {
  'use strict';

  const stage = document.getElementById('travelerStage');
  if (!stage) return;

  const hour = new Date().getHours();
  stage.dataset.time = hour < 6 || hour >= 20 ? 'night' : hour >= 17 ? 'dusk' : 'day';

  const assets = [
    'assets/characters/character_idle.webp',
    'assets/characters/character_thinking.webp',
    'assets/characters/character_smile.webp',
    'assets/characters/character_sit.webp',
    'assets/characters/character_harmonica.webp',
    'assets/fire/fire_01.webp',
    'assets/fire/fire_03.webp',
    'assets/fire/fire_low.webp'
  ];

  assets.forEach((src) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
  });
})();
