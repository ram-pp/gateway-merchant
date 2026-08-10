/**
 * In-process SSE hub. Keyed by paymentId (string) -> Set of res streams.
 * Single-process only (matches "own Node process" — no cross-instance fan-out
 * needed for the MVP; documented as a scale-later item).
 */

const subscribers = new Map();

function subscribe(paymentId, res) {
  const key = String(paymentId);
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key).add(res);

  res.on('close', () => {
    const set = subscribers.get(key);
    if (set) {
      set.delete(res);
      if (set.size === 0) subscribers.delete(key);
    }
  });
}

function publish(paymentId, event, data) {
  const key = String(paymentId);
  const set = subscribers.get(key);
  if (!set || set.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      // ignore — client will be cleaned up on 'close'
    }
  }
}

module.exports = { subscribe, publish };
