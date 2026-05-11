import { Router } from "express";
import {
  sendMessage,
  getMessages,
  getThread,
  editMessage,
  deleteMessage,
  reactToMessage,
  pinMessage,
  searchMessages,
} from "../controllers/messageController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireWorkspaceMember } from "../middlewares/workspaceMiddleware.js";

// mergeParams inherits :workspaceId (and :channelId where nested)
const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireWorkspaceMember);

// ── Workspace-level search  /api/workspaces/:workspaceId/messages/search ──────
router.get("/search", searchMessages);

// ── Channel messages  /api/workspaces/:workspaceId/channels/:channelId/messages
router.get ("/", getMessages);
router.post("/", sendMessage);

// ── Single message ────────────────────────────────────────────────────────────
router.patch ("/:messageId",        editMessage);
router.delete("/:messageId",        deleteMessage);

// ── Thread ────────────────────────────────────────────────────────────────────
router.get("/:messageId/thread",    getThread);

// ── Reactions & pins ──────────────────────────────────────────────────────────
router.post ("/:messageId/react",   reactToMessage);
router.patch("/:messageId/pin",     pinMessage);

export default router;