// ── 404 handler ───────────────────────────────────────────────────────────────
export const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message    = err.message || "Internal server error";

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] ?? "field";
    message = `${field} already exists`;
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError")  { statusCode = 401; message = "Invalid token"; }
  if (err.name === "TokenExpiredError")  { statusCode = 401; message = "Token expired"; }

  // Don't leak stack traces in production
  const stack = process.env.NODE_ENV === "production" ? undefined : err.stack;

  res.status(statusCode).json({ success: false, message, ...(stack && { stack }) });
};