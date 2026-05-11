import { useCallback } from "react";
import { useAsync } from "./useAsync.js";
import api from "../lib/api.js";

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export function useLoginMutation() {
  return useAsync(
    useCallback(
      ({ email, password }) =>
        api.post("/auth/login", { email, password }).then((r) => r.data),
      []
    )
  );
}

export function useRegisterMutation() {
  return useAsync(
    useCallback(
      (payload) => api.post("/auth/register", payload).then((r) => r.data),
      []
    )
  );
}

export function useForgotPasswordMutation() {
  return useAsync(
    useCallback(
      (email) =>
        api.post("/auth/forgot-password", { email }).then((r) => r.data),
      []
    )
  );
}

export function useResetPasswordMutation() {
  return useAsync(
    useCallback(
      ({ token, password }) =>
        api
          .post("/auth/reset-password", { token, password })
          .then((r) => r.data),
      []
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────────────────────────────────────

export function useGetMe() {
  return useAsync(
    useCallback(() => api.get("/users/me").then((r) => r.data.data), [])
  );
}

export function useUpdateProfile() {
  return useAsync(
    useCallback(
      (formData) =>
        api.patch("/users/me", formData).then((r) => r.data.data),
      []
    )
  );
}

export function useUpdateStatus() {
  return useAsync(
    useCallback(
      ({ status, customStatus }) =>
        api
          .patch("/users/me/status", { status, customStatus })
          .then((r) => r.data),
      []
    )
  );
}

export function useChangePassword() {
  return useAsync(
    useCallback(
      ({ currentPassword, newPassword }) =>
        api
          .patch("/users/me/password", { currentPassword, newPassword })
          .then((r) => r.data),
      []
    )
  );
}

export function useSearchUsers(workspaceId) {
  return useAsync(
    useCallback(
      (q) =>
        api
          .get(`/workspaces/${workspaceId}/users/search`, { params: { q } })
          .then((r) => r.data.data),
      [workspaceId]
    )
  );
}

export function useGetUserProfile(workspaceId) {
  return useAsync(
    useCallback(
      (userId) =>
        api
          .get(`/workspaces/${workspaceId}/users/${userId}`)
          .then((r) => r.data.data),
      [workspaceId]
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKSPACE
// ─────────────────────────────────────────────────────────────────────────────

export function useGetWorkspaces() {
  return useAsync(
    useCallback(() => api.get("/workspaces").then((r) => r.data.data), [])
  );
}

export function useCreateWorkspace() {
  return useAsync(
    useCallback(
      (payload) =>
        api.post("/workspaces", payload).then((r) => r.data.data),
      []
    )
  );
}

export function useGetWorkspace(workspaceId) {
  return useAsync(
    useCallback(
      () =>
        api.get(`/workspaces/${workspaceId}`).then((r) => r.data.data),
      [workspaceId]
    )
  );
}

export function useUpdateWorkspace(workspaceId) {
  return useAsync(
    useCallback(
      (payload) =>
        api
          .patch(`/workspaces/${workspaceId}`, payload)
          .then((r) => r.data.data),
      [workspaceId]
    )
  );
}

export function useGenerateInviteLink(workspaceId) {
  return useAsync(
    useCallback(
      () =>
        api
          .post(`/workspaces/${workspaceId}/invite-link`)
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

export function useJoinViaInvite() {
  return useAsync(
    useCallback(
      (inviteToken) =>
        api
          .post(`/workspaces/join/${inviteToken}`)
          .then((r) => r.data.data),
      []
    )
  );
}

export function useRemoveMember(workspaceId) {
  return useAsync(
    useCallback(
      (memberId) =>
        api
          .delete(`/workspaces/${workspaceId}/members/${memberId}`)
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

export function useUpdateMemberRole(workspaceId) {
  return useAsync(
    useCallback(
      ({ memberId, role }) =>
        api
          .patch(`/workspaces/${workspaceId}/members/${memberId}/role`, { role })
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

export function useLeaveWorkspace(workspaceId) {
  return useAsync(
    useCallback(
      () =>
        api.delete(`/workspaces/${workspaceId}/leave`).then((r) => r.data),
      [workspaceId]
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANNEL
// ─────────────────────────────────────────────────────────────────────────────

export function useGetChannels(workspaceId) {
  return useAsync(
    useCallback(
      (params) =>
        api
          .get(`/workspaces/${workspaceId}/channels`, { params })
          .then((r) => r.data.data),
      [workspaceId]
    )
  );
}

export function useGetChannel(workspaceId) {
  return useAsync(
    useCallback(
      (channelId) =>
        api
          .get(`/workspaces/${workspaceId}/channels/${channelId}`)
          .then((r) => r.data.data),
      [workspaceId]
    )
  );
}

export function useCreateChannel(workspaceId) {
  return useAsync(
    useCallback(
      (payload) =>
        api
          .post(`/workspaces/${workspaceId}/channels`, payload)
          .then((r) => r.data.data),
      [workspaceId]
    )
  );
}

export function useUpdateChannel(workspaceId) {
  return useAsync(
    useCallback(
      ({ channelId, ...payload }) =>
        api
          .patch(`/workspaces/${workspaceId}/channels/${channelId}`, payload)
          .then((r) => r.data.data),
      [workspaceId]
    )
  );
}

export function useJoinChannel(workspaceId) {
  return useAsync(
    useCallback(
      (channelId) =>
        api
          .post(`/workspaces/${workspaceId}/channels/${channelId}/join`)
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

export function useLeaveChannel(workspaceId) {
  return useAsync(
    useCallback(
      (channelId) =>
        api
          .delete(`/workspaces/${workspaceId}/channels/${channelId}/leave`)
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

export function useArchiveChannel(workspaceId) {
  return useAsync(
    useCallback(
      (channelId) =>
        api
          .patch(`/workspaces/${workspaceId}/channels/${channelId}/archive`)
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

export function useUpdateChannelMembership(workspaceId) {
  return useAsync(
    useCallback(
      ({ channelId, isMuted, isFavorited }) =>
        api
          .patch(`/workspaces/${workspaceId}/channels/${channelId}/me`, {
            isMuted,
            isFavorited,
          })
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

export function useMarkChannelRead(workspaceId) {
  return useAsync(
    useCallback(
      (channelId) =>
        api
          .patch(`/workspaces/${workspaceId}/channels/${channelId}/read`)
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE
// ─────────────────────────────────────────────────────────────────────────────

export function useGetMessages(workspaceId, channelId) {
  return useAsync(
    useCallback(
      (params) =>
        api
          .get(
            `/workspaces/${workspaceId}/channels/${channelId}/messages`,
            { params }
          )
          .then((r) => r.data),
      [workspaceId, channelId]
    )
  );
}

export function useSendMessage(workspaceId, channelId) {
  return useAsync(
    useCallback(
      (payload) =>
        api
          .post(
            `/workspaces/${workspaceId}/channels/${channelId}/messages`,
            payload
          )
          .then((r) => r.data.data),
      [workspaceId, channelId]
    )
  );
}

export function useEditMessage(workspaceId, channelId) {
  return useAsync(
    useCallback(
      ({ messageId, text }) =>
        api
          .patch(
            `/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}`,
            { text }
          )
          .then((r) => r.data.data),
      [workspaceId, channelId]
    )
  );
}

export function useDeleteMessage(workspaceId, channelId) {
  return useAsync(
    useCallback(
      (messageId) =>
        api
          .delete(
            `/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}`
          )
          .then((r) => r.data),
      [workspaceId, channelId]
    )
  );
}

export function useReactToMessage(workspaceId, channelId) {
  return useAsync(
    useCallback(
      ({ messageId, emoji }) =>
        api
          .post(
            `/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/react`,
            { emoji }
          )
          .then((r) => r.data),
      [workspaceId, channelId]
    )
  );
}

export function usePinMessage(workspaceId, channelId) {
  return useAsync(
    useCallback(
      (messageId) =>
        api
          .patch(
            `/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/pin`
          )
          .then((r) => r.data),
      [workspaceId, channelId]
    )
  );
}

export function useGetThread(workspaceId, channelId) {
  return useAsync(
    useCallback(
      (messageId) =>
        api
          .get(
            `/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/thread`
          )
          .then((r) => r.data.data),
      [workspaceId, channelId]
    )
  );
}

export function useSearchMessages(workspaceId) {
  return useAsync(
    useCallback(
      (params) =>
        api
          .get(`/workspaces/${workspaceId}/messages/search`, { params })
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DIRECT MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

export function useGetDMs(workspaceId) {
  return useAsync(
    useCallback(
      () =>
        api
          .get(`/workspaces/${workspaceId}/dms`)
          .then((r) => r.data.data),
      [workspaceId]
    )
  );
}

export function useOpenDM(workspaceId) {
  return useAsync(
    useCallback(
      (recipientId) =>
        api
          .post(`/workspaces/${workspaceId}/dms`, { recipientId })
          .then((r) => r.data.data),
      [workspaceId]
    )
  );
}

export function useCreateGroupDM(workspaceId) {
  return useAsync(
    useCallback(
      ({ participantIds, groupName }) =>
        api
          .post(`/workspaces/${workspaceId}/dms/group`, {
            participantIds,
            groupName,
          })
          .then((r) => r.data.data),
      [workspaceId]
    )
  );
}

export function useGetDMMessages(workspaceId) {
  return useAsync(
    useCallback(
      ({ dmId, ...params }) =>
        api
          .get(`/workspaces/${workspaceId}/dms/${dmId}/messages`, { params })
          .then((r) => r.data.data),
      [workspaceId]
    )
  );
}

export function useMarkDMRead(workspaceId) {
  return useAsync(
    useCallback(
      (dmId) =>
        api
          .patch(`/workspaces/${workspaceId}/dms/${dmId}/read`)
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

export function useHideDM(workspaceId) {
  return useAsync(
    useCallback(
      (dmId) =>
        api
          .patch(`/workspaces/${workspaceId}/dms/${dmId}/hide`)
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export function useGetNotifications(workspaceId) {
  return useAsync(
    useCallback(
      (params) =>
        api
          .get(`/workspaces/${workspaceId}/notifications`, { params })
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

export function useGetUnreadCount() {
  return useAsync(
    useCallback(
      () =>
        api
          .get("/notifications/unread-count")
          .then((r) => r.data.unreadCount),
      []
    )
  );
}

export function useMarkNotificationRead(workspaceId) {
  return useAsync(
    useCallback(
      (notificationId) =>
        api
          .patch(
            `/workspaces/${workspaceId}/notifications/${notificationId}/read`
          )
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

export function useMarkAllNotificationsRead(workspaceId) {
  return useAsync(
    useCallback(
      () =>
        api
          .patch(`/workspaces/${workspaceId}/notifications/read-all`)
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

export function useDeleteNotification(workspaceId) {
  return useAsync(
    useCallback(
      (notificationId) =>
        api
          .delete(
            `/workspaces/${workspaceId}/notifications/${notificationId}`
          )
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

export function useClearAllNotifications(workspaceId) {
  return useAsync(
    useCallback(
      () =>
        api
          .delete(`/workspaces/${workspaceId}/notifications`)
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILES
// ─────────────────────────────────────────────────────────────────────────────

export function useUploadFile(workspaceId) {
  return useAsync(
    useCallback(
      ({ file, channelId, messageId }) => {
        const form = new FormData();
        form.append("file", file);
        if (channelId) form.append("channelId", channelId);
        if (messageId) form.append("messageId", messageId);
        return api
          .post(`/workspaces/${workspaceId}/files/upload`, form, {
            headers: { "Content-Type": "multipart/form-data" },
          })
          .then((r) => r.data.data);
      },
      [workspaceId]
    )
  );
}

export function useGetWorkspaceFiles(workspaceId) {
  return useAsync(
    useCallback(
      (params) =>
        api
          .get(`/workspaces/${workspaceId}/files`, { params })
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

export function useGetChannelFiles(workspaceId) {
  return useAsync(
    useCallback(
      ({ channelId, ...params }) =>
        api
          .get(`/workspaces/${workspaceId}/files/channel/${channelId}`, {
            params,
          })
          .then((r) => r.data),
      [workspaceId]
    )
  );
}

export function useDeleteFile(workspaceId) {
  return useAsync(
    useCallback(
      (fileId) =>
        api
          .delete(`/workspaces/${workspaceId}/files/${fileId}`)
          .then((r) => r.data),
      [workspaceId]
    )
  );
} 