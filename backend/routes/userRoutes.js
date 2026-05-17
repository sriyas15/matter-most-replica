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
import { uploadAvatar } from "../middlewares/uploadMiddleware.js";

const router = Router({ mergeParams: true }); // mergeParams so :workspaceId is visible

router.use(protect);

// ── Current user ──────────────────────────────────────────────────────────────
router.get("/me", getMe);
router.patch("/me", uploadAvatar, updateProfile);
router.patch("/me/status", updateStatus);
router.patch("/me/password", changePassword);
router.delete("/me", deactivateAccount);

// ── Workspace-scoped user lookup ──────────────────────────────────────────────
// Mounted at /api/workspaces/:workspaceId/users — so these are just /search and /:userId
router.get("/search", requireWorkspaceMember, searchUsers);
router.get("/:userId",  requireWorkspaceMember, getUserProfile);

export default router;