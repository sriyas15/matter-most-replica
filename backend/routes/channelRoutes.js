import { Router } from "express";
import {
  createChannel,
  getChannels,
  getChannel,
  updateChannel,
  archiveChannel,
  joinChannel,
  leaveChannel,
  updateMyMembership,
  markChannelRead,
} from "../controllers/channelController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireWorkspaceMember, requireWorkspaceRole } from "../middlewares/workspaceMiddleware.js";

// mergeParams lets us read :workspaceId from the parent workspace router
const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireWorkspaceMember);   // every channel route needs workspace membership

// ── Collection  /api/workspaces/:workspaceId/channels ────────────────────────
router.get ("/", getChannels);
router.post("/", requireWorkspaceRole("admin"), createChannel);

// ── Single channel ────────────────────────────────────────────────────────────
router.get   ("/:channelId",         getChannel);
router.patch ("/:channelId",         updateChannel);
router.patch ("/:channelId/archive", archiveChannel);

// ── Membership actions ────────────────────────────────────────────────────────
router.post  ("/:channelId/join",    joinChannel);
router.delete("/:channelId/leave",   leaveChannel);
router.patch ("/:channelId/me",      updateMyMembership);   // mute / favorite
router.patch ("/:channelId/read",    markChannelRead);

export default router;