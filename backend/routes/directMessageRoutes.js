import { Router } from "express";
import {
  getDMs,
  createOrGetDM,
  createGroupDM,
  getDMMessages,
  markDMRead,
  hideDM,
} from "../controllers/directMessageController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireWorkspaceMember } from "../middlewares/workspaceMiddleware.js";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireWorkspaceMember);

// ── /api/workspaces/:workspaceId/dms ─────────────────────────────────────────
router.get ("/",       getDMs);
router.post("/",       createOrGetDM);       // body: { recipientId }
router.post("/group",  createGroupDM);       // body: { participantIds, groupName? }

// ── /api/workspaces/:workspaceId/dms/:dmId ────────────────────────────────────
router.get   ("/:dmId/messages", getDMMessages);
router.patch ("/:dmId/read",     markDMRead);
router.patch ("/:dmId/hide",     hideDM);

export default router;