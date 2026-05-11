import rateLimit from "express-rate-limit";

// ── Generic factory ───────────────────────────────────────────────────────────
const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: message },
  });

// ── Auth routes (strict) ──────────────────────────────────────────────────────
export const authLimiter = createLimiter(
  15 * 60 * 1000,   // 15 min window
  10,               // max 10 attempts
  "Too many auth attempts. Try again after 15 minutes."
);

// ── General API ───────────────────────────────────────────────────────────────
export const apiLimiter = createLimiter(
  60 * 1000,        // 1 min window
  100,              // max 100 req/min
  "Too many requests. Slow down."
);

// ── File upload ───────────────────────────────────────────────────────────────
export const uploadLimiter = createLimiter(
  60 * 1000,        // 1 min window
  20,               // max 20 uploads/min
  "Upload limit reached. Try again shortly."
);

// ── Message send ──────────────────────────────────────────────────────────────
export const messageLimiter = createLimiter(
  10 * 1000,        // 10 sec window
  20,               // max 20 messages/10s
  "Sending too fast. Slow down a bit."
);