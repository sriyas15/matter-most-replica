import { Router } from "express";
import {
  getMe,
  updateProfile,
  updateStatus,
  changePassword,
  searchUsers,
  getUserProfile,
  deactivateAccount,
} from "../controllers/userContoller.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireWorkspaceMember } from "../middlewares/workspaceMiddleware.js";
import { uploadAvatar } from "../middlewares/uploadMiddleware.js";   // multer/S3 for avatars

const router = Router();

// ── Current user ──────────────────────────────────────────────────────────────
router.use(protect);   // all user routes require auth

router.get("/me", getMe);
router.patch("/me", uploadAvatar, updateProfile);
router.patch("/me/status", updateStatus);
router.patch("/me/password", changePassword);
router.delete("/me", deactivateAccount);

// ── Workspace-scoped user lookup ──────────────────────────────────────────────
// mounted under /api/workspaces/:workspaceId via workspace router — re-exported here for clarity
router.get(
  "/workspaces/:workspaceId/search",
  requireWorkspaceMember,
  searchUsers
);

router.get(
  "/workspaces/:workspaceId/:userId",
  requireWorkspaceMember,
  getUserProfile
);

export default router;