import { Router } from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import workspaceRoutes from "./workspaceRoutes.js";
import channelRoutes from "./channelRoutes.js";
import messageRoutes from "./messageRoutes.js";
import dmRoutes from "./directMessageRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import fileRoutes from "./fileRoutes.js";

const router = Router();

// ── Auth (public) ─────────────────────────────────────────────────────────────
router.use("/auth", authRoutes);

// ── Users ─────────────────────────────────────────────────────────────────────
router.use("/users", userRoutes);

// ── Global notification count (no workspace scope) ────────────────────────────
router.use("/notifications", notificationRoutes);

// ── Workspaces ────────────────────────────────────────────────────────────────
router.use("/workspaces", workspaceRoutes);

// ── Workspace-scoped resources (nested under /workspaces/:workspaceId) ────────
router.use("/workspaces/:workspaceId/channels", channelRoutes);
router.use("/workspaces/:workspaceId/dms", dmRoutes);
router.use("/workspaces/:workspaceId/files", fileRoutes);
router.use("/workspaces/:workspaceId/notifications", notificationRoutes);

// ── Workspace-scoped user search ──────────────────────────────────────────────
router.use("/workspaces/:workspaceId/users", userRoutes);

// ── Messages nested under channels ───────────────────────────────────────────
//   /api/workspaces/:workspaceId/channels/:channelId/messages
router.use("/workspaces/:workspaceId/channels/:channelId/messages", messageRoutes);

//   /api/workspaces/:workspaceId/messages/search  (workspace-wide search)
router.use("/workspaces/:workspaceId/messages", messageRoutes);

export default router;

/*
 * ─── Full route map ───────────────────────────────────────────────────────────
 *
 * AUTH
 *   POST   /api/auth/register
 *   POST   /api/auth/login
 *   POST   /api/auth/logout
 *   POST   /api/auth/refresh
 *   GET    /api/auth/verify-email?token=
 *   POST   /api/auth/forgot-password
 *   POST   /api/auth/reset-password
 *
 * USERS
 *   GET    /api/users/me
 *   PATCH  /api/users/me
 *   PATCH  /api/users/me/status
 *   PATCH  /api/users/me/password
 *   DELETE /api/users/me
 *   GET    /api/workspaces/:wid/users/search?q=
 *   GET    /api/workspaces/:wid/users/:userId
 *
 * WORKSPACES
 *   GET    /api/workspaces
 *   POST   /api/workspaces
 *   POST   /api/workspaces/join/:inviteToken
 *   GET    /api/workspaces/:wid
 *   PATCH  /api/workspaces/:wid
 *   PATCH  /api/workspaces/:wid/archive
 *   DELETE /api/workspaces/:wid/leave
 *   POST   /api/workspaces/:wid/invite-link
 *   DELETE /api/workspaces/:wid/members/:memberId
 *   PATCH  /api/workspaces/:wid/members/:memberId/role
 *
 * CHANNELS
 *   GET    /api/workspaces/:wid/channels
 *   POST   /api/workspaces/:wid/channels
 *   GET    /api/workspaces/:wid/channels/:cid
 *   PATCH  /api/workspaces/:wid/channels/:cid
 *   PATCH  /api/workspaces/:wid/channels/:cid/archive
 *   POST   /api/workspaces/:wid/channels/:cid/join
 *   DELETE /api/workspaces/:wid/channels/:cid/leave
 *   PATCH  /api/workspaces/:wid/channels/:cid/me
 *   PATCH  /api/workspaces/:wid/channels/:cid/read
 *
 * MESSAGES
 *   GET    /api/workspaces/:wid/messages/search?q=
 *   GET    /api/workspaces/:wid/channels/:cid/messages
 *   POST   /api/workspaces/:wid/channels/:cid/messages
 *   PATCH  /api/workspaces/:wid/channels/:cid/messages/:mid
 *   DELETE /api/workspaces/:wid/channels/:cid/messages/:mid
 *   GET    /api/workspaces/:wid/channels/:cid/messages/:mid/thread
 *   POST   /api/workspaces/:wid/channels/:cid/messages/:mid/react
 *   PATCH  /api/workspaces/:wid/channels/:cid/messages/:mid/pin
 *
 * DIRECT MESSAGES
 *   GET    /api/workspaces/:wid/dms
 *   POST   /api/workspaces/:wid/dms
 *   POST   /api/workspaces/:wid/dms/group
 *   GET    /api/workspaces/:wid/dms/:dmId/messages
 *   PATCH  /api/workspaces/:wid/dms/:dmId/read
 *   PATCH  /api/workspaces/:wid/dms/:dmId/hide
 *
 * NOTIFICATIONS
 *   GET    /api/notifications/unread-count
 *   GET    /api/workspaces/:wid/notifications
 *   PATCH  /api/workspaces/:wid/notifications/read-all
 *   DELETE /api/workspaces/:wid/notifications
 *   PATCH  /api/workspaces/:wid/notifications/:nid/read
 *   DELETE /api/workspaces/:wid/notifications/:nid
 *   PATCH  /api/workspaces/:wid/notifications/:nid/push-sent   [service token]
 *   PATCH  /api/workspaces/:wid/notifications/:nid/email-sent  [service token]
 *
 * FILES
 *   GET    /api/workspaces/:wid/files
 *   POST   /api/workspaces/:wid/files/upload
 *   GET    /api/workspaces/:wid/files/channel/:cid
 *   GET    /api/workspaces/:wid/files/:fileId
 *   DELETE /api/workspaces/:wid/files/:fileId
 *   PATCH  /api/workspaces/:wid/files/:fileId/scan             [service token]
 */