// Lightweight in-process ML metrics registry
// Tracks per-model call counts and latency distributions for health/observability.

const SNAPSHOT_TTL_MS = 5 * 60 * 1000; // 5 minutes heatmap-ish freshness (not strictly used here)

const store = {
  // modelName -> { calls, totalMs, events: { eventName -> { count, totalMs } } }
  models: {}
};

function _ensureModel(model) {
  if (!store.models[model]) {
    store.models[model] = { calls: 0, totalMs: 0, events: {} };
  }
  return store.models[model];
}

function record(model, event, durationMs) {
  const m = _ensureModel(model);
  m.calls += 1;
  m.totalMs += durationMs;
  if (!m.events[event]) m.events[event] = { count: 0, totalMs: 0 };
  m.events[event].count += 1;
  m.events[event].totalMs += durationMs;
}

function getSnapshot() {
  const out = {};
  for (const [model, stats] of Object.entries(store.models)) {
    const avg = stats.calls > 0 ? stats.totalMs / stats.calls : 0;
    const events = {};
    for (const [ev, evStats] of Object.entries(stats.events)) {
      events[ev] = {
        count: evStats.count,
        avgMs: evStats.totalMs / (evStats.count || 1)
      };
    }
    out[model] = {
      calls: stats.calls,
      avgLatencyMs: avg,
      events
    };
  }
  return {
    timestamp: new Date().toISOString(),
    models: out
  };
}

module.exports = {
  record,
  getSnapshot
};
