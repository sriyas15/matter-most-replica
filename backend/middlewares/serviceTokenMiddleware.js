/**
 * serviceTokenMiddleware.js
 *
 * Protects internal-only endpoints that background workers call directly
 * (e.g. email queue marking a notification as email-sent, push service
 * marking a notification as push-sent).
 *
 * These routes are NOT called by the browser — they are called by:
 *   - An email worker (nodemailer queue)
 *   - A push notification worker (FCM / APNs)
 *   - Any internal microservice / cron job
 *
 * Auth flow:
 *   Worker sends the request with a shared secret in the header:
 *     X-Service-Token: <SERVICE_SECRET from .env>
 *
 *   This middleware checks that header value against the env variable.
 *   No JWT, no user session, no DB query needed.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IMPORTANT — add this to your .env:
 *   SERVICE_SECRET=some_long_random_secret_only_your_workers_know
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * requireServiceToken
 *
 * Usage in routes:
 *   router.patch("/:id/push-sent",  requireServiceToken, markPushSent);
 *   router.patch("/:id/email-sent", requireServiceToken, markEmailSent);
 */
export const requireServiceToken = (req, res, next) => {
  const SERVICE_SECRET = process.env.SERVICE_SECRET;

  // Fail hard at startup if the secret is not configured
  if (!SERVICE_SECRET) {
    console.error("[serviceToken] SERVICE_SECRET is not set in .env");
    return res.status(500).json({
      success: false,
      error: "Server misconfiguration: service secret not set",
    });
  }

  const token = req.headers["x-service-token"];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Missing X-Service-Token header",
    });
  }

  // Constant-time comparison to prevent timing attacks
  if (!_safeCompare(token, SERVICE_SECRET)) {
    return res.status(403).json({
      success: false,
      error: "Invalid service token",
    });
  }

  // Mark the request as an internal service call so controllers can check it
  req.isServiceCall = true;
  next();
};

/**
 * Constant-time string comparison
 * Prevents timing attacks where an attacker measures response time
 * to guess the secret character by character.
 */
const _safeCompare = (a, b) => {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
};