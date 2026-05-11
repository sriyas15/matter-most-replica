import mongoose from "mongoose";

/**
 * cursorPaginate
 *
 * Cursor-based pagination for MongoDB — efficient and stable for real-time
 * feeds like chat (no skipped/duplicate messages when new ones arrive).
 *
 * Strategy: use the _id (ObjectId) as the cursor because:
 *   - It encodes the creation timestamp (first 4 bytes)
 *   - It is unique and naturally sortable
 *   - No extra index needed beyond the default _id index
 *
 * Usage:
 *   const result = await cursorPaginate(Message, {
 *     filter:  { channel: channelId, isDeleted: false },
 *     sort:    "desc",            // newest first (default)
 *     limit:   30,
 *     cursor:  req.query.cursor,  // _id of the oldest message the client has
 *     populate: [{ path: "sender", select: "displayName avatar avatarColor" }],
 *   });
 *
 * Response shape:
 *   {
 *     data:       [...documents],
 *     nextCursor: "64f1a2b3c4d5e6f7a8b9c0d1",  // pass back as ?cursor= on next request
 *     hasMore:    true,
 *     total:      undefined,   // only set when countTotal: true (expensive)
 *   }
 */
export const cursorPaginate = async (Model, options = {}) => {
  const {
    filter     = {},
    sort       = "desc",          // "asc" | "desc"
    limit      = 30,
    cursor     = null,            // _id string from the previous page
    populate   = [],
    select     = null,
    countTotal = false,
  } = options;

  const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
  const isDesc    = sort === "desc";

  // Build cursor condition
  const cursorFilter = { ...filter };
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    cursorFilter._id = isDesc
      ? { $lt: new mongoose.Types.ObjectId(cursor) }   // older than cursor
      : { $gt: new mongoose.Types.ObjectId(cursor) };  // newer than cursor
  }

  // Fetch one extra document to determine hasMore
  let query = Model.find(cursorFilter)
    .sort({ _id: isDesc ? -1 : 1 })
    .limit(safeLimit + 1);

  if (select)          query = query.select(select);
  if (populate.length) query = query.populate(populate);

  const docs    = await query.lean();
  const hasMore = docs.length > safeLimit;
  if (hasMore) docs.pop();  // remove the extra probe document

  // The next cursor is the _id of the last document returned
  const nextCursor = hasMore
    ? docs[docs.length - 1]?._id?.toString() ?? null
    : null;

  const result = { data: docs, nextCursor, hasMore };

  if (countTotal) {
    result.total = await Model.countDocuments(filter);
  }

  return result;
};

/**
 * offsetPaginate
 *
 * Classic page/limit pagination — useful for admin tables and search results
 * where stable ordering matters less than random access.
 *
 * Usage:
 *   const result = await offsetPaginate(User, {
 *     filter: { isDeactivated: false },
 *     page:   req.query.page,
 *     limit:  req.query.limit,
 *     sort:   { createdAt: -1 },
 *   });
 */
export const offsetPaginate = async (Model, options = {}) => {
  const {
    filter   = {},
    page     = 1,
    limit    = 20,
    sort     = { createdAt: -1 },
    populate = [],
    select   = null,
  } = options;

  const safePage  = Math.max(Number(page), 1);
  const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
  const skip      = (safePage - 1) * safeLimit;

  const [data, total] = await Promise.all([
    (() => {
      let q = Model.find(filter).sort(sort).skip(skip).limit(safeLimit);
      if (select)          q = q.select(select);
      if (populate.length) q = q.populate(populate);
      return q.lean();
    })(),
    Model.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / safeLimit);

  return {
    data,
    pagination: {
      total,
      totalPages,
      currentPage: safePage,
      perPage:     safeLimit,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
};

/**
 * parseCursorQuery
 *
 * Convenience helper to extract cursor pagination params from req.query.
 *
 * Usage in a controller:
 *   const { cursor, limit, sort } = parseCursorQuery(req.query);
 */
export const parseCursorQuery = (query = {}) => ({
  cursor: query.cursor  || null,
  limit:  query.limit   || 30,
  sort:   query.sort === "asc" ? "asc" : "desc",
});