import { Router } from "express";
import {
  uploadFile,
  getWorkspaceFiles,
  getFile,
  deleteFile,
  getChannelFiles,
  updateScanStatus,
} from "../controllers/fileController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireWorkspaceMember } from "../middlewares/workspaceMiddleware.js";
import { requireServiceToken } from "../middlewares/serviceTokenMiddleware.js";
import upload from "../middlewares/multer.js";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireWorkspaceMember);

// ── /api/workspaces/:workspaceId/files ────────────────────────────────────────
router.post("/", upload.single("file"), uploadFile);
// ── /api/workspaces/:workspaceId/channels/:channelId/files ────────────────────
// (mounted separately via channel sub-router — see index.js)
router.get("/channel/:channelId", getChannelFiles);      // ?fileType=&page=

// ── Single file ───────────────────────────────────────────────────────────────
router.get("/:fileId", getFile);
router.delete("/:fileId", deleteFile);

// ── Internal: virus scan callback (worker auth only) ─────────────────────────
router.patch("/:fileId/scan", requireServiceToken, updateScanStatus);

export default router;