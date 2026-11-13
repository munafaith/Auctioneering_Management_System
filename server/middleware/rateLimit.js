// A small in-memory rate limiter, so no extra package is needed.
// It remembers recent hits per key (for example IP + email) and refuses
// further requests with a 429 until the time window passes.
function createLimiter({ windowMs, max, message, key }) {
  const hits = new Map(); // key -> { count, resetAt }

  // Clear out expired entries once a minute so memory does not grow
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }, 60 * 1000).unref();

  const keyOf = (req) => (key ? key(req) : req.ip);

  const state = (req) => {
    const k = keyOf(req);
    const now = Date.now();
    let e = hits.get(k);
    if (!e || e.resetAt <= now) {
      e = { count: 0, resetAt: now + windowMs };
      hits.set(k, e);
    }
    return e;
  };

  return {
    // Counts every request
    all(req, res, next) {
      const e = state(req);
      e.count += 1;
      if (e.count > max) return refuse(res, e, message);
      next();
    },
    // Blocks when the limit is already reached, but only counts failures you record
    gate(req, res, next) {
      const e = state(req);
      if (e.count >= max) return refuse(res, e, message);
      next();
    },
    fail(req) { state(req).count += 1; },
    reset(req) { hits.delete(keyOf(req)); },
  };
}

function refuse(res, e, message) {
  const seconds = Math.ceil((e.resetAt - Date.now()) / 1000);
  res.set("Retry-After", String(seconds));
  return res.status(429).json({
    message: `${message} Try again in ${Math.ceil(seconds / 60)} minute(s).`,
  });
}

module.exports = createLimiter;
