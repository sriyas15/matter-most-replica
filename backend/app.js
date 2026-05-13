import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";

import apiRoutes from "./routes/index.js";
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";

dotenv.config({ path: "backend/.env" });
const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
console.log(process.env.CLIENT_URL)
app.use(
  cors({
    origin: "http://localhost:3000",//https://matter-most-replica.vercel.app
    credentials: true,           // allow cookies (refresh token)
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ── Sanitise MongoDB operators in req.body / req.query / req.params ───────────
// app.use(
//   mongoSanitize({
//     replaceWith: "_",
//     allowDots: true,
//     sanitizeQuery: false
//   })
// );

// ── HTTP request logger ───────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ── Global rate limiter ───────────────────────────────────────────────────────
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 min
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later" },
  })
);

// ── Tighter limiter for auth endpoints ────────────────────────────────────────

app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: "Too many auth attempts, please try again later" },
  })
);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), env: process.env.NODE_ENV })
);

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api", apiRoutes);

// ── 404 & global error handler ────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;