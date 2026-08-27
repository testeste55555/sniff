(() => {
  'use strict';

  const stage = document.getElementById('travelerStage');
  const image = document.getElementById('travelerImage');
  if (!stage || !image) return;

  const poses = {
    idle: ['assets/characters/character_idle.webp', '川辺に立つ旅人'],
    thinking: ['assets/characters/character_thinking.webp', '静かに考える旅人'],
    smile: ['assets/characters/character_smile.webp', '控えめに微笑む旅人'],
    sit: ['assets/characters/character_sit.webp', '川辺に腰を下ろす旅人'],
    harmonica: ['assets/characters/character_harmonica.webp', '座ってハーモニカを吹く旅人']
  };

  function setPose(pose) {
    const next = poses[pose] ? pose : 'idle';
    stage.dataset.pose = next;
    stage.dataset.state = next;
    image.src = poses[next][0];
    image.alt = poses[next][1];
  }

  function setLeaving(leaving) {
    stage.dataset.leaving = leaving ? 'true' : 'false';
  }

  setPose('idle');
  setLeaving(false);

  window.SniffCharacter = Object.freeze({ setLeaving, setPose });
})();
