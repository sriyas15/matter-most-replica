import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

/**
 * Maps a MIME type to the correct Cloudinary resource_type.
 * Using "auto" mangles raw-file URLs — always map explicitly.
 */
const getResourceType = (mime) => {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  // audio, pdf, docx, zip, txt → "raw" preserves the file as-is
  return "raw";
};

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer        - File data
 * @param {string} mimetype      - e.g. "image/png"
 * @param {string} originalname  - e.g. "screenshot.png"
 * @param {string} [folder]      - Cloudinary folder, default "chat_files"
 * @returns {Promise<object>}    - Cloudinary upload result (includes secure_url, public_id, etc.)
 */
export const uploadToCloudinary = (
  buffer,
  mimetype,
  originalname,
  folder = "chat_files"
) =>
  new Promise((resolve, reject) => {
    const resourceType = getResourceType(mimetype);

    // Strip extension — Cloudinary appends it automatically based on the file.
    // Sending it twice causes duplication in the stored filename.
    const publicId = originalname.replace(/\.[^/.]+$/, "");

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id:     publicId,
        unique_filename: true,  // avoids collisions between users
        overwrite:       false, // never silently replace an existing file
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });

/**
 * Delete a file from Cloudinary by its public_id.
 * Use this when deleting messages or clearing chats to avoid orphaned files.
 */
export const deleteFromCloudinary = (publicId, resourceType = "image") =>
  cloudinary.uploader.destroy(publicId, { resource_type: resourceType });