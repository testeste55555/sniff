(() => {
  'use strict';

  const Content = window.SniffContent;
  const Storage = window.SniffStorage;
  if (!Content || !Storage) return;

  const WEATHER_IDS = ['clear', 'cloudy', 'wind', 'light_rain'];
  const SPOT_IDS = ['river_edge', 'campfire', 'fallen_log', 'tent_side'];
  const MOOD_IDS = ['quiet', 'good', 'bored', 'playful', 'restless'];
  const VALLEY_IDS = ['none', 'moomin', 'littlemy', 'mama', 'papa'];
  const ACTIVITY_BY_TIME = {
    dawn: ['fishing', 'watch_river', 'eat_bread', 'return_walk'],
    day: ['fishing', 'watch_river', 'tend_fire', 'tidy_tent', 'eat_bread', 'harmonica', 'return_walk'],
    dusk: ['watch_river', 'tend_fire', 'tidy_tent', 'eat_bread', 'harmonica'],
    night: ['watch_river', 'tend_fire', 'harmonica']
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function formatDayKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getTimeBand(date) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 17) return 'day';
    if (hour >= 17 && hour < 20) return 'dusk';
    return 'night';
  }

  function getSeason(dayKey) {
    const month = Number(dayKey.slice(5, 7));
    if ([3, 4, 5].includes(month)) return { id: 'spring', label: '春' };
    if ([6, 7, 8].includes(month)) return { id: 'summer', label: '夏' };
    if ([9, 10, 11].includes(month)) return { id: 'autumn', label: '秋' };
    return { id: 'winter', label: '冬' };
  }

  function hash32(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  function makeRandom(seed) {
    let value = seed >>> 0 || 0x6d2b79f5;
    return () => {
      value += 0x6d2b79f5;
      let mixed = value;
      mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(random, values) {
    return values[Math.floor(random() * values.length) % values.length];
  }

  function createDeviceSeed(randomBytes) {
    const bytes = new Uint8Array(16);
    if (typeof randomBytes === 'function') randomBytes(bytes);
    else if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
    else {
      for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function daysBetween(fromDay, toDay) {
    if (!fromDay || !toDay) return 0;
    const fromParts = fromDay.split('-').map(Number);
    const toParts = toDay.split('-').map(Number);
    const from = Date.UTC(fromParts[0], fromParts[1] - 1, fromParts[2]);
    const to = Date.UTC(toParts[0], toParts[1] - 1, toParts[2]);
    return Math.max(0, Math.round((to - from) / 86400000));
  }

  function rankForTrust(trust) {
    if (trust >= 11) return 3;
    if (trust >= 7) return 2;
    if (trust >= 3) return 1;
    return 0;
  }

  function flagValue(flags, prefix) {
    const flag = (flags || []).find((item) => item.startsWith(prefix));
    return flag ? flag.slice(prefix.length) : null;
  }

  function generateWorld(run, currentDate) {
    const random = makeRandom(run.seed);
    const startTimeBand = flagValue(run.flags, 'start_time_') || getTimeBand(currentDate);
    const season = getSeason(run.dayKey);
    const weather = pick(random, WEATHER_IDS);
    const spot = pick(random, SPOT_IDS);
    const mood = pick(random, MOOD_IDS);
    let activityPool = ACTIVITY_BY_TIME[startTimeBand].slice();
    if (weather === 'light_rain') activityPool = activityPool.filter((id) => !['fishing', 'return_walk'].includes(id));
    if (weather === 'wind') activityPool = activityPool.filter((id) => id !== 'harmonica');
    if (mood === 'restless') activityPool.push('return_walk');
    if (mood === 'playful') activityPool.push('fishing');
    if (!activityPool.length) activityPool = ['watch_river'];
    const activity = pick(random, activityPool);
    const valleyPresence = pick(random, VALLEY_IDS);
    const incidentId = flagValue(run.flags, 'incident_') || pick(random, Object.keys(Content.INCIDENTS));
    const departurePressure = Math.floor(random() * 4);
    return {
      season: season.id,
      seasonLabel: season.label,
      startTimeBand,
      currentTimeBand: getTimeBand(currentDate),
      weather,
      spot,
      mood,
      activity,
      valleyPresence,
      incidentId,
      departurePressure
    };
  }

  function createEngine(options = {}) {
    const storage = options.storage || Storage.createStorage(options.localStorage);
    const now = typeof options.now === 'function' ? options.now : () => new Date();
    let state = storage.load();

    function save() {
      state = storage.save(state);
    }

    function selectIncident(seed) {
      const all = Object.keys(Content.INCIDENTS);
      const recent = new Set(state.seenIncidentIds.slice(-4));
      const available = all.filter((id) => !recent.has(id));
      const pool = available.length ? available : all;
      const random = makeRandom(seed ^ 0xa5a5a5a5);
      return pick(random, pool);
    }

    function startNewRun(date) {
      const today = formatDayKey(date);
      const previousVisit = state.lastVisitDate;
      if (!state.deviceSeed) state.deviceSeed = createDeviceSeed(options.randomBytes);
      const seed = hash32(`${today}:${state.deviceSeed}`);
      const incidentId = selectIncident(seed);
      const flags = [`start_time_${getTimeBand(date)}`, `incident_${incidentId}`];
      if (previousVisit && daysBetween(previousVisit, today) >= 7) flags.push('long_absence');

      state.visits += 1;
      state.lastVisitDate = today;
      state.seenIncidentIds = [...state.seenIncidentIds.filter((id) => id !== incidentId), incidentId].slice(-10);
      state.activeRun = {
        dayKey: today,
        seed,
        phase: 'ARRIVAL',
        nodeId: 'arrival',
        flags,
        selectedChoiceIds: [],
        ended: false,
        endReason: null
      };
      save();
    }

    function ensureToday() {
      const date = now();
      const today = formatDayKey(date);
      if (!state.activeRun || state.activeRun.dayKey !== today) startNewRun(date);
      return date;
    }

    function collectEffects() {
      const effects = { trust: 0, flags: [], memories: [] };
      for (const choiceId of state.activeRun.selectedChoiceIds) {
        const choice = Content.findChoice(choiceId);
        if (!choice?.effects) continue;
        effects.trust += Number(choice.effects.trust || 0);
        if (Array.isArray(choice.effects.flags)) effects.flags.push(...choice.effects.flags);
        if (choice.effects.memory) effects.memories.push(choice.effects.memory);
      }
      return effects;
    }

    function finish(endReason) {
      const effects = collectEffects();
      const runTrustChange = Math.max(-1, Math.min(1, effects.trust));
      state.trust = Math.max(0, Math.min(12, state.trust + runTrustChange));
      state.distanceRank = rankForTrust(state.trust);

      const existing = new Set(state.memoryIds);
      const newMemories = [];
      for (const memoryId of effects.memories) {
        if (!existing.has(memoryId)) newMemories.push(memoryId);
        existing.add(memoryId);
      }
      state.memoryIds = [...state.memoryIds, ...newMemories]
        .filter((id, index, list) => list.lastIndexOf(id) === index)
        .slice(-12);
      state.activeRun.flags = [...new Set([
        ...state.activeRun.flags,
        ...effects.flags,
        ...newMemories.map((id) => `new_memory_${id}`)
      ])].slice(-64);
      state.activeRun.phase = 'ENDED';
      state.activeRun.nodeId = 'terminal';
      state.activeRun.ended = true;
      state.activeRun.endReason = endReason || 'event_resolved';
      save();
    }

    function currentWorld(date) {
      return generateWorld(state.activeRun, date || now());
    }

    function getNewMemoryId() {
      return flagValue(state.activeRun?.flags, 'new_memory_');
    }

    function getView() {
      const date = ensureToday();
      const world = currentWorld(date);
      if (state.activeRun.ended) {
        const memoryId = getNewMemoryId();
        return {
          ended: true,
          phase: 'ENDED',
          nodeId: 'terminal',
          situation: Content.getSituation(world),
          text: Content.getEnding(state.activeRun.endReason),
          closing: 'また明日。',
          memoryText: memoryId ? `今日残ったこと：${Content.getMemoryLabel(memoryId)}` : '',
          pose: state.activeRun.endReason === 'traveler_leave' ? 'idle' : 'smile',
          leaving: state.activeRun.endReason === 'traveler_leave',
          fireMode: 'normal',
          sceneCaption: Content.getSceneCaption(world),
          choices: [],
          allowFreeTopic: false,
          world
        };
      }

      const node = Content.getNode(state.activeRun.nodeId, { world, state });
      return {
        ended: false,
        phase: node.phase,
        nodeId: node.id,
        situation: node.situation || Content.getSituation(world),
        text: node.text,
        pose: node.pose || 'idle',
        leaving: false,
        fireMode: node.fireMode || 'normal',
        sceneCaption: Content.getSceneCaption(world),
        choices: node.choices || [],
        allowFreeTopic: Boolean(node.allowFreeTopic) && !state.activeRun.flags.includes('other_talk_used'),
        world
      };
    }

    function choose(choiceId) {
      const view = getView();
      if (view.ended) return view;
      const choice = view.choices.find((item) => item.id === choiceId);
      if (!choice) return view;
      if (state.activeRun.selectedChoiceIds.length >= 8) {
        finish('departure_time');
        return getView();
      }

      state.activeRun.selectedChoiceIds.push(choice.id);
      if (choice.endReason) {
        finish(choice.endReason);
        return getView();
      }

      const next = Content.NODES[choice.next] ? Content.NODES[choice.next] : null;
      state.activeRun.nodeId = choice.next || 'terminal';
      state.activeRun.phase = next?.phase || (choice.next === 'incident' ? 'INCIDENT' : 'ENDED');
      save();
      return getView();
    }

    function handleFreeInput(raw) {
      const view = getView();
      if (!view.allowFreeTopic) return null;
      const result = Content.handleTopic(raw, view.world);
      state.activeRun.flags = [...new Set([...state.activeRun.flags, 'other_talk_used', `topic_${result.id}`])].slice(-64);
      save();
      return result;
    }

    function clearAll() {
      storage.clear();
      state = Storage.defaultState();
    }

    ensureToday();

    return Object.freeze({
      choose,
      clearAll,
      getState: () => clone(state),
      getView,
      handleFreeInput
    });
  }

  window.SniffRunEngine = Object.freeze({
    createEngine,
    daysBetween,
    formatDayKey,
    generateWorld,
    getTimeBand,
    hash32,
    rankForTrust
  });
})();
