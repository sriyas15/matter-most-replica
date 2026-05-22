import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => socket;

export const connectSocket = () => {
  
  if (socket) return socket;

  const token = localStorage.getItem("accessToken");

  socket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("[socket] connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[socket] error:", err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};