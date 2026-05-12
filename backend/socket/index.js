import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { registerMessageHandlers } from "./handlers/messageHandler.js";
import registerChannelHandlers from "./handlers/channelHandler.js";
import { registerDMHandlers } from "./handlers/directMessageHandler.js";
import { registerPresenceHandlers } from "./handlers/presenceHandler.js";
import { registerMeetingHandlers } from "./handlers/meetingHandler.js";
import { registerPresence } from "./presence.js";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "https://matter-most-replica.vercel.app",
      methods: ["GET", "POST","PUT", "DELETE"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Socket auth middleware ──────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) return next(new Error("Authentication token missing"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user || user.isDeactivated)
        return next(new Error("User not found or deactivated"));

      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
  const { user } = socket;

  console.log(`[Socket] Connected: ${user.username}`);

  socket.join(`user:${user._id}`);

  registerPresence(io, socket);
  registerMessageHandlers(io, socket);
  registerChannelHandlers(io, socket);
  registerDMHandlers(io, socket);
  registerPresenceHandlers(io, socket);
  registerMeetingHandlers(io, socket);

  socket.on("disconnect", (reason) => {
    console.log(`[Socket] Disconnected: ${user.username} — ${reason}`);
  });
});
  return io;
};

// Export so controllers/services can emit events server-side
export const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialised. Call initSocket first.");
  return io;
};