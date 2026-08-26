(() => {
  'use strict';

  const stage = document.getElementById('travelerStage');
  const caption = document.getElementById('stageCaption');
  const image = document.getElementById('travelerImage');
  const form = document.getElementById('composer');
  const input = document.getElementById('messageInput');
  const quick = document.getElementById('quickChoices');

  if (!stage || !caption) return;

  let state = 'idle';
  let resetTimer = null;
  let ambientTimer = null;

  const captions = {
    idle: '静かに川を見ています',
    look: '考えごとをしています',
    smile: '控えめに微笑みました',
    sit: '川辺に腰を下ろしました',
    harmonica: 'ハーモニカを手に取りました',
    leave: '今日はもう行くようです'
  };

  const poses = {
    idle: ['assets/characters/character_idle.webp', '川辺に立つ旅人'],
    look: ['assets/characters/character_thinking.webp', '考えながらしゃがむ旅人'],
    smile: ['assets/characters/character_smile.webp', '控えめに微笑む旅人'],
    sit: ['assets/characters/character_sit.webp', '川辺に腰を下ろす旅人'],
    harmonica: ['assets/characters/character_harmonica.webp', '座ってハーモニカを吹く旅人'],
    leave: ['assets/characters/character_smile.webp', '静かに微笑む旅人']
  };

  function setState(next, duration = 0) {
    clearTimeout(resetTimer);
    state = next;
    stage.dataset.state = next;
    caption.textContent = captions[next] || '';
    if (image && poses[next]) {
      image.src = poses[next][0];
      image.alt = poses[next][1];
    }

    if (duration > 0 && next !== 'leave') {
      resetTimer = setTimeout(() => setState('idle'), duration);
    }
  }

  function react(text) {
    const t = String(text || '').trim();
    if (!t) return;

    if (/またね|帰る|さよなら|じゃあね/.test(t)) {
      setState('leave');
      return;
    }

    if (/ハーモニカ|吹いて|曲|音楽/.test(t)) {
      setState('harmonica', 3600);
      return;
    }

    if (/ありがとう|ありがと|嬉し|うれし/.test(t)) {
      setState('smile', 2400);
      return;
    }

    if (/座って|すわって|休んで|ひと休み/.test(t)) {
      setState('sit', 3200);
      return;
    }

    if (/寂し|ムーミン|旅|自由|ずっと|どうして|なんで/.test(t)) {
      setState('look', 2200);
      return;
    }

    if (state !== 'leave') setState('idle');
  }

  form?.addEventListener('submit', () => react(input?.value), true);
  quick?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-message]');
    if (button) react(button.dataset.message);
  }, true);

  function scheduleAmbient() {
    clearTimeout(ambientTimer);
    const wait = 7000 + Math.random() * 9000;
    ambientTimer = setTimeout(() => {
      if (state === 'idle') setState('look', 1400 + Math.random() * 1200);
      scheduleAmbient();
    }, wait);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(ambientTimer);
    else scheduleAmbient();
  });

  setState('idle');
  scheduleAmbient();
})();
