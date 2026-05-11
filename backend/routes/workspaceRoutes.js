import { Router } from "express";
import {
    createWorkspace,
    getMyWorkspaces,
    getWorkspace,
    updateWorkspace,
    generateInviteLink,
    joinViaInviteLink,
    removeMember,
    updateMemberRole,
    leaveWorkspace,
    archiveWorkspace,
} from "../controllers/workspaceController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireWorkspaceMember, requireWorkspaceRole } from "../middlewares/workspaceMiddleware.js";
import { uploadLogo } from "../middlewares/uploadMiddleware.js";
import channelRoutes from "./channelRoutes.js";   

const router = Router();

router.use(protect);

// ── Collection ────────────────────────────────────────────────────────────────
router.get("/", getMyWorkspaces);
router.post("/", createWorkspace);

// ── Invite link (no workspace membership required — token is the auth) ────────
router.post("/join/:inviteToken", joinViaInviteLink);

// ── Single workspace ──────────────────────────────────────────────────────────
router.get("/:workspaceId", requireWorkspaceMember, getWorkspace);
router.patch("/:workspaceId", requireWorkspaceRole("admin"), uploadLogo, updateWorkspace);
router.patch("/:workspaceId/archive", requireWorkspaceRole("owner"), archiveWorkspace);
router.delete("/:workspaceId/leave", requireWorkspaceMember, leaveWorkspace);

// ── Invite link management ────────────────────────────────────────────────────
router.post("/:workspaceId/invite-link", requireWorkspaceRole("admin"), generateInviteLink);

// ── Member management ─────────────────────────────────────────────────────────
router.delete("/:workspaceId/members/:memberId", requireWorkspaceRole("admin"), removeMember);
router.patch("/:workspaceId/members/:memberId/role", requireWorkspaceRole("owner"), updateMemberRole);

router.use("/:workspaceId/channels", channelRoutes);

export default router;