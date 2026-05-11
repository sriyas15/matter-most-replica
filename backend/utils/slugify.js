import Channel from "../models/Channel.js";

/**
 * slugify
 *
 * Converts a human-readable string into a URL-safe, lowercase slug.
 *
 * Examples:
 *   slugify("Dev Backend")    → "dev-backend"
 *   slugify("  Hello World!") → "hello-world"
 *   slugify("node.js & Go")   → "nodejs-go"
 */
export const slugify = (text = "") =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")   // strip non-word chars except spaces & hyphens
    .replace(/[\s_]+/g, "-")    // spaces / underscores → hyphen
    .replace(/-{2,}/g, "-")     // collapse multiple hyphens
    .replace(/^-+|-+$/g, "");   // trim leading/trailing hyphens

/**
 * uniqueChannelSlug
 *
 * Generates a unique channel name (slug) by appending a numeric suffix
 * if the base slug already exists in the DB.
 *
 * Examples (if "general" already exists):
 *   "general"   → "general-1"
 *   "general-1" → "general-2"
 *
 * @param {string} base  Human-readable channel name
 * @returns {Promise<string>} Unique slug safe to save
 */
export const uniqueChannelSlug = async (base) => {
  const baseSlug = slugify(base);
  let candidate  = baseSlug;
  let suffix     = 1;

  while (await Channel.exists({ name: candidate })) {
    candidate = `${baseSlug}-${suffix++}`;
  }

  return candidate;
};

/**
 * generateInviteToken
 *
 * Creates a cryptographically random, URL-safe token for invite links.
 * Uses Web Crypto API (available in Node 19+) or falls back to Math.random.
 *
 * @param {number} length  Byte length before base64 encoding (default 32 → ~43 chars)
 * @returns {string}
 */
export const generateInviteToken = (length = 32) => {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Buffer.from(bytes)
      .toString("base64url")  // URL-safe base64 (no +, /, = padding)
      .slice(0, length);
  }

  // Fallback for older Node versions
  const { randomBytes } = await import("crypto");
  return randomBytes(length).toString("hex").slice(0, length);
};