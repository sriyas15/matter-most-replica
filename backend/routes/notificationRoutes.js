import { Router } from "express";
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    markPushSent,
    markEmailSent,
} from "../controllers/notificationController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireWorkspaceMember } from "../middlewares/workspaceMiddleware.js";
import { requireServiceToken } from "../middlewares/serviceTokenMiddleware.js";  // internal worker auth

const router = Router({ mergeParams: true });

router.use(protect);

// ── Global (no workspace scope) ───────────────────────────────────────────────
// /api/notifications/unread-count
router.get("/unread-count", getUnreadCount);

// ── Workspace-scoped  /api/workspaces/:workspaceId/notifications ──────────────
router.get("/", requireWorkspaceMember, getNotifications);
router.patch("/read-all", requireWorkspaceMember, markAllAsRead);
router.delete("/", requireWorkspaceMember, clearAllNotifications);

router.patch("/:notificationId/read", requireWorkspaceMember, markAsRead);
router.delete("/:notificationId", requireWorkspaceMember, deleteNotification);

// ── Internal worker endpoints (service-token protected, no user session needed)
router.patch("/:notificationId/push-sent", requireServiceToken, markPushSent);
router.patch("/:notificationId/email-sent", requireServiceToken, markEmailSent);

export default router;