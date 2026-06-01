import dotenv from 'dotenv';

const ACCESS_SECRET  = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const ACCESS_EXPIRES  = process.env.JWT_ACCESS_EXPIRES;
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES;

// ── Sign ──────────────────────────────────────────────────────────────────────
export const signAccessToken = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });

export const signTokenPair = (payload) => ({
  accessToken:  signAccessToken(payload),
  refreshToken: signRefreshToken(payload),
});

// ── Verify ────────────────────────────────────────────────────────────────────
export const verifyAccessToken = (token) => {
  try {
    return { valid: true, decoded: jwt.verify(token, ACCESS_SECRET) };
  } catch (err) {
    return { valid: false, error: err.message };
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return { valid: true, decoded: jwt.verify(token, REFRESH_SECRET) };
  } catch (err) {
    return { valid: false, error: err.message };
  }
};

// ── Decode without verifying (for reading expiry etc.) ────────────────────────
export const decodeToken = (token) => jwt.decode(token);

// ── Extract token from Authorization header ───────────────────────────────────
export const extractBearerToken = (authHeader) => {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1];
};