// ── Success ───────────────────────────────────────────────────────────────────

/**
 * Send a 200 OK response.
 * @param {Response} res
 * @param {*}        data
 * @param {string}   message
 */
export const ok = (res, data = null, message = "Success") =>
  res.status(200).json({ success: true, message, data });

/**
 * Send a 201 Created response.
 */
export const created = (res, data = null, message = "Created successfully") =>
  res.status(201).json({ success: true, message, data });

/**
 * Send a 204 No Content response (no body).
 */
export const noContent = (res) => res.status(204).send();

// ── Paginated success ─────────────────────────────────────────────────────────

/**
 * Send a paginated cursor-based response.
 * @param {Response} res
 * @param {Array}    data
 * @param {{ nextCursor, hasMore, total? }} meta
 */
export const paginated = (res, data, meta) =>
  res.status(200).json({
    success: true,
    data,
    meta: {
      nextCursor: meta.nextCursor ?? null,
      hasMore:    meta.hasMore    ?? false,
      ...(meta.total !== undefined && { total: meta.total }),
    },
  });

/**
 * Send a paginated offset-based response.
 */
export const paginatedOffset = (res, data, pagination) =>
  res.status(200).json({ success: true, data, pagination });

// ── Client errors ─────────────────────────────────────────────────────────────

export const badRequest = (res, error = "Bad request", details = null) =>
  res.status(400).json({ success: false, error, ...(details && { details }) });

export const unauthorised = (res, error = "Unauthorised") =>
  res.status(401).json({ success: false, error });

export const forbidden = (res, error = "Forbidden") =>
  res.status(403).json({ success: false, error });

export const notFound = (res, resource = "Resource") =>
  res.status(404).json({ success: false, error: `${resource} not found` });

export const conflict = (res, error = "Conflict") =>
  res.status(409).json({ success: false, error });

export const unprocessable = (res, error = "Unprocessable entity", details = null) =>
  res.status(422).json({ success: false, error, ...(details && { details }) });

export const tooManyRequests = (res, error = "Too many requests") =>
  res.status(429).json({ success: false, error });

// ── Server errors ─────────────────────────────────────────────────────────────

export const serverError = (res, error = "Internal server error") =>
  res.status(500).json({ success: false, error });

// ── Global error handler middleware ──────────────────────────────────────────
/**
 * Mount last in your Express app:
 *   app.use(errorHandler);
 */
export const errorHandler = (err, req, res, next) => {  // eslint-disable-line no-unused-vars
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const details = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
    return unprocessable(res, "Validation failed", details);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? "field";
    return conflict(res, `${field} already exists`);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return badRequest(res, `Invalid value for ${err.path}`);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError")  return unauthorised(res, "Invalid token");
  if (err.name === "TokenExpiredError")  return unauthorised(res, "Token expired");

  return serverError(res, err.message || "Something went wrong");
};

// ── Default export: object for named access ───────────────────────────────────
export default {
  ok,
  created,
  noContent,
  paginated,
  paginatedOffset,
  badRequest,
  unauthorised,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  tooManyRequests,
  serverError,
  errorHandler,
};