import dotenv from 'dotenv'
import crypto from "crypto";

dotenv.config({path:"backend/.env"})
const ALGO = "aes-256-gcm";
const KEY_HEX = process.env.MESSAGE_ENCRYPTION_KEY;
const ENCRYPTED_PREFIX = "enc:";

// ── Validate key at startup ───────────────────────────────────────────────────
if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error(
        "MESSAGE_ENCRYPTION_KEY must be set as a 64-character hex string (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
}

const KEY = Buffer.from(KEY_HEX, "hex");

/**
 * Encrypt plaintext string.
 * Returns "enc:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encrypt(plaintext) {
    if (!plaintext) return plaintext;               // empty / null pass through

    const iv = crypto.randomBytes(12);      // 96-bit IV — recommended for GCM
    const cipher = crypto.createCipheriv(ALGO, KEY, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return (
        ENCRYPTED_PREFIX +
        iv.toString("hex") + ":" +
        authTag.toString("hex") + ":" +
        encrypted.toString("hex")
    );
}

/**
 * Decrypt a value produced by encrypt().
 * If the value is not prefixed with "enc:" it is returned as-is
 * (safe for messages that were saved before encryption was enabled).
 */
export function decrypt(ciphertext) {
    if (!ciphertext) return ciphertext;

    // Not encrypted (legacy message) — return as-is
    if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) return ciphertext;

    const parts = ciphertext.slice(ENCRYPTED_PREFIX.length).split(":");
    if (parts.length !== 3) return ciphertext;     // malformed — degrade gracefully

    const [ivHex, authTagHex, dataHex] = parts;

    try {
        const decipher = crypto.createDecipheriv(
            ALGO,
            KEY,
            Buffer.from(ivHex, "hex")
        );
        decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(dataHex, "hex")),
            decipher.final(),
        ]);

        return decrypted.toString("utf8");
    } catch {
        // Tampered or corrupt — return empty string rather than crash
        return "";
    }
}

/**
 * Decrypt the text field of a message object (or array of messages).
 * Mutates in place and returns the same value for convenience.
 */
export function decryptMessage(msg) {
    if (!msg) return msg;
    if (msg.text !== undefined) msg.text = decrypt(msg.text);
    return msg;
}

export function decryptMessages(msgs) {
    if (!Array.isArray(msgs)) return msgs;
    msgs.forEach(decryptMessage);
    return msgs;
}