import { Router } from "express";
import {
  createChannel,
  getChannels,
  getChannel,
  updateChannel,
  archiveChannel,
  joinChannel,
  leaveChannel,
  addChannelMembers,
  updateMyMembership,
  markChannelRead,
  updateChannelMemberRole,
  removeChannelMember,
} from "../controllers/channelController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireWorkspaceMember, requireWorkspaceRole } from "../middlewares/workspaceMiddleware.js";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireWorkspaceMember);

// ── Collection  /api/workspaces/:workspaceId/channels ────────────────────────
router.get("/", getChannels);
router.post("/", requireWorkspaceRole("admin"), createChannel);

// ── Single channel ────────────────────────────────────────────────────────────
router.get("/:channelId", getChannel);
router.patch("/:channelId", updateChannel);
router.patch("/:channelId/archive", archiveChannel);

// ── Membership actions ────────────────────────────────────────────────────────
router.post("/:channelId/join", joinChannel);
router.delete("/:channelId/leave", leaveChannel);
router.post("/:channelId/members", addChannelMembers);  // ← NEW: add member(s) by userId
router.patch("/:channelId/me", updateMyMembership);
router.patch("/:channelId/read", markChannelRead);
router.patch("/:channelId/members/:memberId/role", updateChannelMemberRole);
router.delete("/:channelId/members/:memberId", removeChannelMember);

export default router;