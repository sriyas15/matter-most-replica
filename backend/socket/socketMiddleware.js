import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * socketAuthMiddleware
 *
 * Authenticates every incoming Socket.IO connection using a JWT.
 * Token can be passed in two ways (client can use either):
 *
 *   1. socket.handshake.auth.token        ← preferred (not in headers/URL)
 *   2. socket.handshake.headers.authorization  → "Bearer <token>"
 *
 * On success  → attaches `socket.user` and calls next()
 * On failure  → calls next(new Error(...)) which triggers a connect_error on client
 *
 * Usage in socket/index.js:
 *   io.use(socketAuthMiddleware);
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    // ── Extract token ─────────────────────────────────────────────────────────
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "").trim();

    if (!token) {
      return next(new Error("AUTH_MISSING: No token provided"));
    }

    // ── Verify token ──────────────────────────────────────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const msg =
        err.name === "TokenExpiredError"
          ? "AUTH_EXPIRED: Token has expired"
          : "AUTH_INVALID: Token is invalid";
      return next(new Error(msg));
    }

    // ── Load user from DB ─────────────────────────────────────────────────────
    const user = await User.findById(decoded.id).select(
      "username displayName avatar avatarColor role status customStatus isDeactivated"
    );

    if (!user) {
      return next(new Error("AUTH_NOT_FOUND: User does not exist"));
    }

    if (user.isDeactivated) {
      return next(new Error("AUTH_DEACTIVATED: Account has been deactivated"));
    }

    // ── Attach to socket ──────────────────────────────────────────────────────
    socket.user = user;
    next();
  } catch (err) {
    console.error("[socketMiddleware] Unexpected error:", err.message);
    next(new Error("AUTH_ERROR: Authentication failed"));
  }
};

/**
 * socketRoleMiddleware
 *
 * Guards specific socket events by role.
 * Use this inside event handlers when only admins/owners should fire an event.
 *
 * Usage inside a handler:
 *   socket.on("admin:broadcast", requireSocketRole("admin", "owner"), handler);
 *
 * @param  {...string} roles  Allowed roles
 * @returns {Function}        Socket event middleware
 */
export const requireSocketRole = (...roles) => {
  return (socket, next) => {
    if (!socket.user) {
      return next(new Error("AUTH_MISSING: Socket not authenticated"));
    }

    if (!roles.includes(socket.user.role)) {
      return next(
        new Error(`AUTH_FORBIDDEN: Required role — ${roles.join(" or ")}`)
      );
    }

    next();
  };
};

/**
 * socketLogMiddleware
 *
 * Logs every connection and disconnection.
 * Mount after socketAuthMiddleware so socket.user is available.
 *
 * Usage in socket/index.js:
 *   io.use(socketAuthMiddleware);
 *   io.use(socketLogMiddleware);
 */
export const socketLogMiddleware = (socket, next) => {
  const { user } = socket;
  const id       = user ? `${user.username} (${user._id})` : socket.id;
  const ip       = socket.handshake.address;

  console.log(`[Socket] CONNECT   | ${id} | ${ip} | ${new Date().toISOString()}`);

  socket.on("disconnect", (reason) => {
    console.log(`[Socket] DISCONNECT | ${id} | ${reason}`);
  });

  next();
};