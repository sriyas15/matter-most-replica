import User from "../models/User.js";

const onlineUsers = new Map();

export const registerPresence = async (io, socket) => {
  const userId = socket.user._id.toString();

  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

  socket.join(userId);

  // ── FIX: read DB status first — don't blindly overwrite with "online" ─────
  if (onlineUsers.get(userId).size === 1) {
    const freshUser = await User.findById(userId).select("status").lean();
    const persistedStatus = freshUser?.status;

    console.log(`[presence] connect: ${socket.user.username} | DB status: ${persistedStatus}`);

    if (!persistedStatus || persistedStatus === "offline") {
      // Was offline (natural disconnect) → bring back online
      await updateStatus(io, userId, "online");
    } else {
      // Was away / dnd → re-broadcast without overwriting
      io.emit("presence:update", { userId, status: persistedStatus });
    }
  }

  socket.on("disconnect", async () => {
    const sockets = onlineUsers.get(userId);
    if (!sockets) return;

    sockets.delete(socket.id);

    if (sockets.size === 0) {
      onlineUsers.delete(userId);

      // Wait 5 seconds before marking offline (reconnect grace period)
      setTimeout(async () => {
        if (!onlineUsers.has(userId)) {
          // ── FIX: only mark offline if still "online" ──────────────────────
          // Don't overwrite away / dnd on tab close
          const freshUser = await User.findById(userId).select("status").lean();
          if (!freshUser || freshUser.status === "online") {
            await User.findByIdAndUpdate(userId, {
              status: "offline",
              lastSeenAt: new Date(),
            });
            io.emit("presence:update", { userId, status: "offline" });
          }
        }
      }, 5000);
    }
  });
};

export const updateStatus = async (io, userId, status) => {
  await User.findByIdAndUpdate(userId, {
    status,
    lastSeenAt: new Date(),
  });

  io.emit("presence:update", {
    userId,
    status,
  });
};