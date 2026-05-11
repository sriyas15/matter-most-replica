import User from "../models/User.js";

const onlineUsers = new Map();

export const registerPresence = (io, socket) => {
  const userId = socket.user._id.toString();

  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

  socket.join(userId);

  updateStatus(io, userId, "online");

  socket.on("disconnect", async () => {
    const sockets = onlineUsers.get(userId);
    if (!sockets) return;

    sockets.delete(socket.id);

    if (sockets.size === 0) {
      onlineUsers.delete(userId);

      // ⬇️ wait 5 seconds before marking offline
      setTimeout(async () => {
        // user may reconnect within 5s
        if (!onlineUsers.has(userId)) {
          await User.findByIdAndUpdate(userId, {
            status: "offline",
            lastSeenAt: new Date(),
          });

          io.emit("presence:update", {
            userId,
            status: "offline",
          });
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