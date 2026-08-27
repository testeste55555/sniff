(() => {
  'use strict';

  const Engine = window.SniffRunEngine;
  if (!Engine) return;

  const elements = {
    situation: document.getElementById('runSituation'),
    speech: document.getElementById('travelerSpeech'),
    choices: document.getElementById('choiceList'),
    otherToggle: document.getElementById('otherTopicToggle'),
    otherForm: document.getElementById('otherTopicForm'),
    otherInput: document.getElementById('otherTopicInput'),
    otherReply: document.getElementById('otherTopicReply'),
    ending: document.getElementById('runEnding'),
    closing: document.getElementById('closingText'),
    memory: document.getElementById('memoryText'),
    reset: document.getElementById('clearDeviceState')
  };

  if (!elements.situation || !elements.speech || !elements.choices) return;

  const engine = Engine.createEngine();

  function applyScene(view) {
    window.SniffScene?.setWeather(view.world.weather);
    window.SniffScene?.setFireMode(view.fireMode);
    window.SniffScene?.setCaption(view.sceneCaption);
    window.SniffCharacter?.setPose(view.pose);
    window.SniffCharacter?.setLeaving(Boolean(view.leaving));
  }

  function makeChoice(choice) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = choice.endReason === 'user_leave' ? 'choice-button choice-leave' : 'choice-button';
    button.dataset.choiceId = choice.id;
    button.textContent = choice.label;
    return button;
  }

  function render(view = engine.getView()) {
    applyScene(view);
    elements.situation.textContent = view.situation;
    elements.speech.textContent = view.text;
    elements.choices.replaceChildren(...view.choices.map(makeChoice));
    elements.choices.hidden = view.ended;
    elements.ending.hidden = !view.ended;
    elements.closing.textContent = view.closing || '';
    elements.memory.textContent = view.memoryText || '';
    elements.memory.hidden = !view.memoryText;
    elements.otherToggle.hidden = !view.allowFreeTopic;
    elements.otherForm.hidden = true;
    elements.otherReply.hidden = true;
    elements.otherReply.textContent = '';
    elements.otherInput.value = '';
    document.body.dataset.runEnded = view.ended ? 'true' : 'false';
  }

  elements.choices.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-choice-id]');
    if (!button) return;
    for (const choiceButton of elements.choices.querySelectorAll('button')) choiceButton.disabled = true;
    render(engine.choose(button.dataset.choiceId));
  });

  elements.otherToggle.addEventListener('click', () => {
    elements.otherForm.hidden = false;
    elements.otherToggle.hidden = true;
    elements.otherInput.focus();
  });

  elements.otherForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const raw = elements.otherInput.value;
    elements.otherInput.value = '';
    const result = engine.handleFreeInput(raw);
    if (!result) return render();
    elements.otherForm.hidden = true;
    elements.otherReply.textContent = result.text;
    elements.otherReply.hidden = false;
    window.SniffCharacter?.setPose(result.pose);
    elements.otherToggle.hidden = true;
  });

  elements.reset.addEventListener('click', () => {
    const confirmed = window.confirm('この端末の来訪回数・距離感・今日の進行をすべて消しますか？');
    if (!confirmed) return;
    engine.clearAll();
    window.location.reload();
  });

  render();
})();
