/**
 * meetingHandler.js
 *
 * Handles WebRTC signalling for peer-to-peer video/audio calls.
 * This server acts as a signalling relay only — media flows directly
 * between peers via WebRTC (no media server required for small calls).
 *
 * For larger group calls (5+ people) consider integrating a media
 * server like mediasoup or LiveKit.
 *
 * ── Room model ──────────────────────────────────────────────────────────────
 * Each meeting has a roomId (channelId or a generated UUID for DM calls).
 * Peers exchange SDP offers/answers and ICE candidates through this relay.
 *
 * ── Events handled ──────────────────────────────────────────────────────────
 *  meeting:start          → initiate a call in a channel/DM
 *  meeting:join           → join an ongoing call
 *  meeting:leave          → leave a call
 *  meeting:end            → host ends the call for everyone
 *  meeting:offer          → WebRTC offer (caller → callee)
 *  meeting:answer         → WebRTC answer (callee → caller)
 *  meeting:ice_candidate  → ICE candidate exchange
 *  meeting:media_toggle   → notify peers of mic/camera mute changes
 *  meeting:screen_share   → notify peers of screen share start/stop
 */

// In-memory meeting rooms: meetingRoomId → { hostId, participants: Map<socketId, userId> }
const meetingRooms = new Map();

export const registerMeetingHandlers = (io, socket) => {
  const { user } = socket;

  // ── Start a call ────────────────────────────────────────────────────────────
  socket.on("meeting:start", ({ roomId, channelId }, ack) => {
    try {
      if (meetingRooms.has(roomId)) {
        return ack?.({ success: false, error: "A call is already active in this room" });
      }

      meetingRooms.set(roomId, {
        hostId:       user._id.toString(),
        channelId,
        startedAt:    new Date(),
        participants: new Map([[socket.id, user._id.toString()]]),
      });

      socket.join(`meeting:${roomId}`);

      // Notify all channel members that a call has started
      io.to(`channel:${channelId}`).emit("meeting:started", {
        roomId,
        channelId,
        startedBy: {
          userId:      user._id,
          displayName: user.displayName,
          avatar:      user.avatar,
        },
      });

      ack?.({ success: true, roomId });
    } catch (err) {
      console.error("[meeting:start]", err);
      ack?.({ success: false, error: "Failed to start meeting" });
    }
  });

  // ── Join a call ─────────────────────────────────────────────────────────────
  socket.on("meeting:join", ({ roomId }, ack) => {
    try {
      const room = meetingRooms.get(roomId);
      if (!room) return ack?.({ success: false, error: "Meeting not found" });

      room.participants.set(socket.id, user._id.toString());
      socket.join(`meeting:${roomId}`);

      // Tell everyone else in the room that a new peer arrived
      socket.to(`meeting:${roomId}`).emit("meeting:peer_joined", {
        socketId:    socket.id,
        userId:      user._id,
        displayName: user.displayName,
        avatar:      user.avatar,
      });

      // Send the newcomer the list of existing participants
      const existingPeers = [...room.participants.entries()]
        .filter(([sid]) => sid !== socket.id)
        .map(([socketId, userId]) => ({ socketId, userId }));

      ack?.({ success: true, existingPeers, roomId });
    } catch (err) {
      console.error("[meeting:join]", err);
      ack?.({ success: false, error: "Failed to join meeting" });
    }
  });

  // ── Leave a call ────────────────────────────────────────────────────────────
  socket.on("meeting:leave", ({ roomId }) => {
    _leaveMeeting(io, socket, roomId);
  });

  // ── End call (host only) ────────────────────────────────────────────────────
  socket.on("meeting:end", ({ roomId }, ack) => {
    try {
      const room = meetingRooms.get(roomId);
      if (!room) return ack?.({ success: false, error: "Meeting not found" });

      if (room.hostId !== user._id.toString() && user.role !== "admin" && user.role !== "owner") {
        return ack?.({ success: false, error: "Only the host can end the meeting" });
      }

      io.to(`meeting:${roomId}`).emit("meeting:ended", { roomId, endedBy: user._id });
      io.in(`meeting:${roomId}`).socketsLeave(`meeting:${roomId}`);
      meetingRooms.delete(roomId);

      ack?.({ success: true });
    } catch (err) {
      console.error("[meeting:end]", err);
      ack?.({ success: false, error: "Failed to end meeting" });
    }
  });

  // ── WebRTC: send offer to a specific peer ──────────────────────────────────
  socket.on("meeting:offer", ({ targetSocketId, sdp, roomId }) => {
    io.to(targetSocketId).emit("meeting:offer", {
      sdp,
      roomId,
      fromSocketId: socket.id,
      fromUserId:   user._id,
    });
  });

  // ── WebRTC: send answer back to the caller ─────────────────────────────────
  socket.on("meeting:answer", ({ targetSocketId, sdp, roomId }) => {
    io.to(targetSocketId).emit("meeting:answer", {
      sdp,
      roomId,
      fromSocketId: socket.id,
    });
  });

  // ── WebRTC: ICE candidate relay ────────────────────────────────────────────
  socket.on("meeting:ice_candidate", ({ targetSocketId, candidate, roomId }) => {
    io.to(targetSocketId).emit("meeting:ice_candidate", {
      candidate,
      roomId,
      fromSocketId: socket.id,
    });
  });

  // ── Media toggle (mic / camera) ────────────────────────────────────────────
  socket.on("meeting:media_toggle", ({ roomId, video, audio }) => {
    socket.to(`meeting:${roomId}`).emit("meeting:peer_media_toggle", {
      socketId: socket.id,
      userId:   user._id,
      video,
      audio,
    });
  });

  // ── Screen share ────────────────────────────────────────────────────────────
  socket.on("meeting:screen_share", ({ roomId, isSharing }) => {
    socket.to(`meeting:${roomId}`).emit("meeting:peer_screen_share", {
      socketId:  socket.id,
      userId:    user._id,
      isSharing,
    });
  });

  // ── Auto-leave on socket disconnect ───────────────────────────────────────
  socket.on("disconnect", () => {
    // Clean up from any meeting rooms this socket was in
    for (const [roomId] of meetingRooms) {
      const room = meetingRooms.get(roomId);
      if (room?.participants.has(socket.id)) {
        _leaveMeeting(io, socket, roomId);
      }
    }
  });
};

// ── Helper: cleanly remove a socket from a meeting room ───────────────────────
function _leaveMeeting(io, socket, roomId) {
  const room = meetingRooms.get(roomId);
  if (!room) return;

  room.participants.delete(socket.id);
  socket.leave(`meeting:${roomId}`);

  // Notify remaining participants
  io.to(`meeting:${roomId}`).emit("meeting:peer_left", {
    socketId: socket.id,
    userId:   socket.user._id,
  });

  // If the room is now empty, clean it up
  if (room.participants.size === 0) {
    meetingRooms.delete(roomId);
  }
  // If the host left, promote the next participant as host
  else if (room.hostId === socket.user._id.toString()) {
    const [newHostSocketId, newHostUserId] = [...room.participants.entries()][0];
    room.hostId = newHostUserId;
    io.to(`meeting:${roomId}`).emit("meeting:host_changed", {
      newHostUserId,
      newHostSocketId,
    });
  }
}