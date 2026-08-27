(() => {
  'use strict';

  const KEY = 'sniff_state_v1';
  const SCHEMA_VERSION = 1;

  function boundedInt(value, min, max, fallback = 0) {
    const number = Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback;
    return Math.min(max, Math.max(min, number));
  }

  function stringIds(value, limit) {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item) => typeof item === 'string' && /^[a-z0-9_-]{1,80}$/i.test(item))
      .slice(-limit);
  }

  function dayKey(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  }

  function defaultState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      deviceSeed: '',
      visits: 0,
      trust: 0,
      distanceRank: 0,
      lastVisitDate: null,
      seenIncidentIds: [],
      memoryIds: [],
      activeRun: null
    };
  }

  function sanitizeRun(run) {
    if (!run || typeof run !== 'object') return null;
    const savedDay = dayKey(run.dayKey);
    const nodeId = typeof run.nodeId === 'string' && /^[a-z0-9_-]{1,80}$/i.test(run.nodeId) ? run.nodeId : 'arrival';
    const phase = typeof run.phase === 'string' && /^[A-Z_]{2,20}$/.test(run.phase) ? run.phase : 'ARRIVAL';
    const endReason = typeof run.endReason === 'string' && /^[a-z_]{1,40}$/.test(run.endReason) ? run.endReason : null;
    if (!savedDay) return null;
    return {
      dayKey: savedDay,
      seed: boundedInt(run.seed, 0, 0xffffffff, 0),
      phase,
      nodeId,
      flags: stringIds(run.flags, 64),
      selectedChoiceIds: stringIds(run.selectedChoiceIds, 8),
      ended: Boolean(run.ended),
      endReason
    };
  }

  function sanitize(value) {
    if (!value || typeof value !== 'object' || Number(value.schemaVersion) !== SCHEMA_VERSION) return defaultState();
    return {
      schemaVersion: SCHEMA_VERSION,
      deviceSeed: typeof value.deviceSeed === 'string' && /^[a-f0-9]{16,64}$/i.test(value.deviceSeed) ? value.deviceSeed : '',
      visits: boundedInt(value.visits, 0, 100000, 0),
      trust: boundedInt(value.trust, 0, 12, 0),
      distanceRank: boundedInt(value.distanceRank, 0, 3, 0),
      lastVisitDate: dayKey(value.lastVisitDate),
      seenIncidentIds: stringIds(value.seenIncidentIds, 10),
      memoryIds: stringIds(value.memoryIds, 12),
      activeRun: sanitizeRun(value.activeRun)
    };
  }

  function createStorage(storage) {
    const target = storage || window.localStorage;
    return {
      key: KEY,
      load() {
        try {
          const raw = target.getItem(KEY);
          return raw ? sanitize(JSON.parse(raw)) : defaultState();
        } catch (_error) {
          return defaultState();
        }
      },
      save(value) {
        const clean = sanitize(value);
        try {
          target.setItem(KEY, JSON.stringify(clean));
        } catch (_error) {
          // Storage can be unavailable in private browsing. The current tab still works.
        }
        return clean;
      },
      clear() {
        try {
          target.removeItem(KEY);
        } catch (_error) {
          // Nothing else should be cleared; other site data does not belong to Sniff.
        }
      }
    };
  }

  window.SniffStorage = Object.freeze({
    KEY,
    SCHEMA_VERSION,
    createStorage,
    defaultState,
    sanitize
  });
})();
