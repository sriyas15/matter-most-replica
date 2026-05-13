import dotenv from "dotenv";
import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./socket/index.js";

dotenv.config({ path: "backend/.env" });

const PORT = process.env.PORT || 4000;

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();

  const httpServer = http.createServer(app);

  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║   🚀  Server running on port ${PORT}        ║
  ║   🌍  ENV : ${(process.env.NODE_ENV || "development").padEnd(28)}║
  ╚══════════════════════════════════════════╝
    `);
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  const shutdown = (signal) => async () => {
    console.log(`\n[server] ${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      const mongoose = (await import("mongoose")).default;
      await mongoose.connection.close();
      console.log("[server] MongoDB connection closed");
      process.exit(0);
    });

    // Force-kill after 10 s if something hangs
    setTimeout(() => {
      console.error("[server] Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", shutdown("SIGTERM"));
  process.on("SIGINT",  shutdown("SIGINT"));
};

// ── Unhandled promise rejections ──────────────────────────────────────────────
process.on("unhandledRejection", (err) => {
  console.error("[server] Unhandled rejection:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception:", err);
  process.exit(1);
});

start();