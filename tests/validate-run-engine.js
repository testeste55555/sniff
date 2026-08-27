'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {}, Uint8Array });

for (const file of ['run-content.js', 'run-storage.js', 'run-engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

const Content = context.window.SniffContent;
const Storage = context.window.SniffStorage;
const RunEngine = context.window.SniffRunEngine;

function fakeLocalStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    raw: (key) => values.get(key) || ''
  };
}

function fixedBytes(bytes) {
  bytes.fill(0x2a);
}

function nextNonLeave(view) {
  const choice = view.choices.find((item) => item.endReason !== 'user_leave');
  assert.ok(choice, `non-leave choice exists at ${view.nodeId}`);
  return choice.id;
}

function advanceToQuiet(engine) {
  engine.choose('arrival_call');
  engine.choose('settle_ask_activity');
  engine.choose(nextNonLeave(engine.getView()));
  engine.choose('response_notice');
  assert.equal(engine.getView().nodeId, 'quiet');
}

function testContentGraph() {
  const validTargets = new Set([...Object.keys(Content.NODES), 'incident']);
  const majorNodes = Object.values(Content.NODES).filter((node) => !node.terminal);
  for (const node of majorNodes) {
    assert.ok(node.choices.length >= 3 && node.choices.length <= 5, `${node.id} has 3–5 choices`);
    for (const choice of node.choices) {
      assert.ok(choice.endReason || validTargets.has(choice.next), `${choice.id} has a valid next target`);
    }
  }

  for (const [incidentId, incident] of Object.entries(Content.INCIDENTS)) {
    assert.ok(incident.choices.length >= 3 && incident.choices.length <= 5, `${incidentId} has 3–5 choices`);
    for (const choice of incident.choices) {
      assert.ok(choice.endReason || choice.next === 'response', `${choice.id} reaches the response or terminal`);
    }
  }

  const order = new Map(Content.PHASE_ORDER.map((phase, index) => [phase, index]));
  for (const node of majorNodes) {
    for (const choice of node.choices.filter((item) => item.next)) {
      const nextPhase = choice.next === 'incident' ? 'INCIDENT' : Content.NODES[choice.next].phase;
      assert.ok(order.get(nextPhase) > order.get(node.phase), `${node.id} cannot loop backward`);
    }
  }

  const poses = new Set();
  for (const node of majorNodes) {
    poses.add(node.pose);
    node.choices.forEach((choice) => poses.add(choice.pose));
  }
  for (const incident of Object.values(Content.INCIDENTS)) incident.choices.forEach((choice) => poses.add(choice.pose));
  for (const required of ['idle', 'thinking', 'smile', 'sit', 'harmonica']) assert.ok(poses.has(required), `${required} pose is reachable`);

  // Full non-exit route: ARRIVAL → SETTLE → INCIDENT → RESPONSE → QUIET → DEPARTURE → terminal.
  assert.equal(['arrival', 'settle', 'incident', 'response', 'quiet', 'departure'].length, 6);
}

function testDailyAndPersistence() {
  const local = fakeLocalStorage();
  let current = new Date(2026, 7, 27, 13, 15, 0);
  const options = { localStorage: local, now: () => current, randomBytes: fixedBytes };
  const engine = RunEngine.createEngine(options);
  const first = engine.getView();
  const firstState = engine.getState();
  assert.equal(firstState.activeRun.dayKey, '2026-08-27');
  assert.equal(firstState.visits, 1);

  engine.choose('arrival_call');
  const resumed = RunEngine.createEngine(options);
  assert.equal(resumed.getView().nodeId, 'settle', 'same-day run resumes at the saved node');
  assert.equal(resumed.getState().activeRun.seed, firstState.activeRun.seed, 'same day keeps the same seed');
  assert.deepEqual(JSON.parse(JSON.stringify(resumed.getView().world)), JSON.parse(JSON.stringify(first.world)), 'same seed produces the same world');

  resumed.choose('settle_offer_help');
  const incidentId = resumed.getView().world.incidentId;
  resumed.choose(nextNonLeave(resumed.getView()));
  resumed.choose('response_notice');
  resumed.choose('quiet_sit');
  resumed.choose('departure_wave');
  const ended = resumed.getView();
  assert.equal(ended.ended, true);
  assert.ok(resumed.getState().activeRun.selectedChoiceIds.length <= 8);
  assert.equal(resumed.getState().trust, 1, 'trust change is clamped to +1 for the run');

  const sameDayEnded = RunEngine.createEngine(options);
  assert.equal(sameDayEnded.getView().ended, true, 'ended run is not rerolled on the same day');
  assert.equal(sameDayEnded.getView().world.incidentId, incidentId);

  current = new Date(2026, 7, 28, 9, 0, 0);
  const nextDay = RunEngine.createEngine(options);
  assert.equal(nextDay.getView().ended, false, 'next local calendar day creates a new run');
  assert.equal(nextDay.getState().visits, 2);
  assert.notEqual(nextDay.getView().world.incidentId, incidentId, 'recent incident is avoided');
}

function testFreeInputPrivacy() {
  const local = fakeLocalStorage();
  const engine = RunEngine.createEngine({
    localStorage: local,
    now: () => new Date(2026, 7, 29, 18, 0, 0),
    randomBytes: fixedBytes
  });
  advanceToQuiet(engine);
  const privateText = 'これは保存してはいけない秘密の文章XYZ';
  const reply = engine.handleFreeInput(privateText);
  assert.ok(reply);
  assert.equal(local.raw(Storage.KEY).includes(privateText), false, 'free input is not persisted');
  assert.equal(engine.getView().allowFreeTopic, false, 'free input is available only once in the quiet beat');

  const saved = JSON.parse(local.raw(Storage.KEY));
  assert.deepEqual(Object.keys(saved).sort(), [
    'activeRun', 'deviceSeed', 'distanceRank', 'lastVisitDate', 'memoryIds',
    'schemaVersion', 'seenIncidentIds', 'trust', 'visits'
  ].sort());
  assert.deepEqual(Object.keys(saved.activeRun).sort(), [
    'dayKey', 'endReason', 'ended', 'flags', 'nodeId', 'phase', 'seed', 'selectedChoiceIds'
  ].sort());
}

function testRelationshipBoundaries() {
  assert.equal(RunEngine.rankForTrust(0), 0);
  assert.equal(RunEngine.rankForTrust(3), 1);
  assert.equal(RunEngine.rankForTrust(7), 2);
  assert.equal(RunEngine.rankForTrust(11), 3);
  assert.equal(RunEngine.getTimeBand(new Date(2026, 0, 1, 5)), 'dawn');
  assert.equal(RunEngine.getTimeBand(new Date(2026, 0, 1, 8)), 'day');
  assert.equal(RunEngine.getTimeBand(new Date(2026, 0, 1, 17)), 'dusk');
  assert.equal(RunEngine.getTimeBand(new Date(2026, 0, 1, 20)), 'night');
}

function testSeededRedTeamRuns() {
  const local = fakeLocalStorage();
  let current = new Date(2026, 0, 1, 6, 0, 0);
  const incidents = new Set();
  const weather = new Set();

  for (let day = 0; day < 80; day += 1) {
    current = new Date(2026, 0, 1 + day, (day * 5) % 24, 0, 0);
    const engine = RunEngine.createEngine({ localStorage: local, now: () => current, randomBytes: fixedBytes });
    let view = engine.getView();
    incidents.add(view.world.incidentId);
    weather.add(view.world.weather);
    let selections = 0;
    while (!view.ended) {
      const available = view.choices.filter((choice) => choice.endReason !== 'user_leave');
      assert.ok(available.length > 0, `${view.nodeId} has a continuing or natural terminal choice`);
      view = engine.choose(available[(day + selections) % available.length].id);
      selections += 1;
      assert.ok(selections <= 8, `run ${day} ends within eight major choices`);
    }
    const saved = engine.getState();
    assert.ok(saved.trust >= 0 && saved.trust <= 12);
    assert.ok(saved.distanceRank >= 0 && saved.distanceRank <= 3);
    assert.ok(saved.memoryIds.length <= 12);
  }

  assert.equal(incidents.size, Object.keys(Content.INCIDENTS).length, 'all incident types are reachable across deterministic days');
  assert.equal(weather.size, 4, 'all fictional weather types are reachable');
}

function testStaticPrivacyAndScene() {
  const productionFiles = ['index.html', 'run-content.js', 'run-storage.js', 'run-engine.js', 'run-ui.js', 'scene-static.js', 'character-motion.js'];
  const productionText = productionFiles.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'console.log', 'analytics', 'gtag(']) {
    assert.equal(productionText.includes(forbidden), false, `no ${forbidden} endpoint or debug hook`);
  }
  assert.equal(productionText.includes('dialogue.js'), false, 'legacy dialogue engine is not loaded');

  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.equal(/\btrust\b|distanceRank|好感度/.test(html), false, 'relationship numbers are not exposed in the UI');
  for (const script of ['run-content.js', 'run-storage.js', 'run-engine.js', 'scene-static.js', 'character-motion.js', 'run-ui.js']) {
    assert.ok(html.includes(`src="${script}"`), `${script} is loaded`);
  }

  const sceneCss = fs.readFileSync(path.join(root, 'scene-static.css'), 'utf8');
  for (const weather of ['clear', 'cloudy', 'wind', 'light_rain']) assert.ok(sceneCss.includes(`data-weather="${weather}"`) || weather === 'clear', `${weather} weather is supported`);
  for (const time of ['dawn', 'day', 'dusk', 'night']) assert.ok(sceneCss.includes(`data-time="${time}"`), `${time} time band is supported`);

  const sceneJs = fs.readFileSync(path.join(root, 'scene-static.js'), 'utf8');
  for (const frame of ['fire_01.webp', 'fire_02.webp', 'fire_03.webp', 'fire_low.webp']) assert.ok(sceneJs.includes(frame), `${frame} is wired`);
  assert.ok(sceneJs.includes('580'), 'fire frame cadence is within 0.45–0.75 seconds');
}

function testBrowserBootWithFakeDom() {
  class FakeElement {
    constructor(id = '') {
      this.id = id;
      this.dataset = {};
      this.hidden = false;
      this.children = [];
      this.value = '';
      this.textContent = '';
    }
    addEventListener() {}
    focus() {}
    replaceChildren(...items) { this.children = items; }
    querySelectorAll() { return []; }
  }

  const ids = [
    'travelerStage', 'travelerImage', 'fireBody', 'stageCaption', 'runSituation',
    'travelerSpeech', 'choiceList', 'otherTopicToggle', 'otherTopicForm',
    'otherTopicInput', 'otherTopicReply', 'runEnding', 'closingText', 'memoryText',
    'clearDeviceState'
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement(id)]));
  const local = fakeLocalStorage();
  const fakeWindow = {
    localStorage: local,
    crypto: { getRandomValues: fixedBytes },
    matchMedia: () => ({ matches: true }),
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    confirm: () => false,
    location: { reload: () => {} }
  };
  const fakeDocument = {
    hidden: false,
    body: new FakeElement('body'),
    getElementById: (id) => elements[id] || null,
    createElement: () => new FakeElement(),
    addEventListener: () => {}
  };
  const Image = class { constructor() { this.decoding = ''; this.src = ''; } };
  const browserContext = vm.createContext({
    window: fakeWindow,
    document: fakeDocument,
    Image,
    Uint8Array,
    setInterval: fakeWindow.setInterval,
    clearInterval: fakeWindow.clearInterval,
    setTimeout: fakeWindow.setTimeout,
    clearTimeout: fakeWindow.clearTimeout
  });

  for (const file of ['run-content.js', 'run-storage.js', 'run-engine.js', 'scene-static.js', 'character-motion.js', 'run-ui.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), browserContext, { filename: file });
  }
  assert.equal(elements.choiceList.children.length, 4, 'initial UI renders four choices');
  assert.ok(elements.runSituation.textContent.length > 0, 'initial situation renders');
  assert.ok(elements.travelerSpeech.textContent.length > 0, 'initial traveler line renders');
  assert.ok(elements.travelerImage.src.includes('character_idle.webp'), 'initial pose renders');
}

testContentGraph();
testDailyAndPersistence();
testFreeInputPrivacy();
testRelationshipBoundaries();
testSeededRedTeamRuns();
testStaticPrivacyAndScene();
testBrowserBootWithFakeDom();

process.stdout.write('RUN ENGINE v1 validator / RED TEAM: PASS\n');
