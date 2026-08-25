(() => {
  'use strict';

  const stage = document.getElementById('travelerStage');
  const caption = document.getElementById('stageCaption');
  const form = document.getElementById('composer');
  const input = document.getElementById('messageInput');
  const quick = document.getElementById('quickChoices');

  if (!stage || !caption) return;

  let state = 'idle';
  let resetTimer = null;
  let ambientTimer = null;

  const captions = {
    idle: '静かに川を見ています',
    look: '少し視線を外しました',
    harmonica: 'ハーモニカを手に取りました',
    leave: '今日はもう行くようです'
  };

  function setState(next, duration = 0) {
    clearTimeout(resetTimer);
    state = next;
    stage.dataset.state = next;
    caption.textContent = captions[next] || '';

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
