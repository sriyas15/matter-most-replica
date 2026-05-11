import User from "../../models/User.js";

// In-memory map: userId → Set of socketIds
// Handles multi-tab: user stays online until ALL tabs disconnect
const onlineUsers = new Map();

/**
 * Events handled:
 *  presence:status_update → user manually changes their status
 *  presence:ping          → heartbeat to keep lastSeenAt fresh
 *  disconnect             → auto-mark offline when all sockets disconnect
 */
export const registerPresenceHandlers = (io, socket) => {
  const { user } = socket;
  const uid      = user._id.toString();

  // ── Track socket in the in-memory map ──────────────────────────────────────
  if (!onlineUsers.has(uid)) onlineUsers.set(uid, new Set());
  onlineUsers.get(uid).add(socket.id);

  // Mark user online on first connection
  if (onlineUsers.get(uid).size === 1) {
    _setStatus(io, user, "online");
  }

  // ── Manual status change ────────────────────────────────────────────────────
  socket.on("presence:status_update", async ({ status, customStatus }, ack) => {
    try {
      const allowed = ["online", "away", "dnd", "offline"];
      if (!allowed.includes(status)) {
        return ack?.({ success: false, error: "Invalid status value" });
      }

      const update = { status, lastSeenAt: new Date() };
      if (customStatus !== undefined) update.customStatus = customStatus;

      await User.findByIdAndUpdate(user._id, update);

      // Broadcast to everyone
      io.emit("presence:user_status", {
        userId: user._id,
        status,
        customStatus: customStatus ?? user.customStatus,
      });

      ack?.({ success: true });
    } catch (err) {
      console.error("[presence:status_update]", err);
      ack?.({ success: false, error: "Failed to update status" });
    }
  });

  // ── Heartbeat ────────────────────────────────────────────────────────────────
  socket.on("presence:ping", async () => {
    await User.findByIdAndUpdate(user._id, { lastSeenAt: new Date() });
  });

  // ── Disconnect ───────────────────────────────────────────────────────────────
  socket.on("disconnect", async () => {
    const sockets = onlineUsers.get(uid);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(uid);
        // All tabs closed → mark offline
        await _setStatus(io, user, "offline");
      }
    }
  });
};

// ── Helper: persist status + broadcast ────────────────────────────────────────
async function _setStatus(io, user, status) {
  try {
    await User.findByIdAndUpdate(user._id, {
      status,
      lastSeenAt: new Date(),
    });

    io.emit("presence:user_status", {
      userId: user._id,
      status,
    });
  } catch (err) {
    console.error("[presence:_setStatus]", err);
  }
}

// ── Utility export: check if a user is online ──────────────────────────────────
export const isUserOnline = (userId) => onlineUsers.has(userId.toString());