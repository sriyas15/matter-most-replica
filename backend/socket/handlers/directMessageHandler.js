import Channel       from "../../models/Channel.js";
import DirectMessage  from "../../models/DirectMessage.js";
import Message        from "../../models/Message.js";

/**
 * Events handled:
 *  dm:open        → open (or create) a DM with a user, join its socket room
 *  dm:send        → send a message inside a DM conversation
 *  dm:mark_read   → mark DM conversation as read
 *  dm:typing      → forward typing indicator
 *  dm:stop_typing → forward stop-typing
 */
export const registerDMHandlers = (io, socket) => {
  const { user } = socket;

  // ── Open / create DM ────────────────────────────────────────────────────────
  socket.on("dm:open", async ({ recipientId }, ack) => {
    try {
      // Find existing 1-on-1 DM
      let dm = await DirectMessage.findBetween(user._id, recipientId);

      if (!dm) {
        // Create backing channel
        const backingChannel = await Channel.create({
          name:      `dm-${[user._id, recipientId].sort().join("-")}`,
          type:      "direct",
          createdBy: user._id,
          members: [
            { user: user._id },
            { user: recipientId },
          ],
        });

        dm = await DirectMessage.create({
          channel: backingChannel._id,
          isGroup: false,
          participants: [
            { user: user._id },
            { user: recipientId },
          ],
        });
      }

      // Both users join the DM socket room
      socket.join(`channel:${dm.channel}`);
      io.to(`user:${recipientId}`).emit("dm:opened", {
        dmId:      dm._id,
        channelId: dm.channel,
        from:      user._id,
      });

      ack?.({ success: true, dm });
    } catch (err) {
      console.error("[dm:open]", err);
      ack?.({ success: false, error: "Failed to open DM" });
    }
  });

  // ── Send DM message ─────────────────────────────────────────────────────────
  socket.on("dm:send", async ({ channelId, text, attachments = [] }, ack) => {
    try {
      const channel = await Channel.findById(channelId);
      if (!channel || !["direct", "group"].includes(channel.type)) {
        return ack?.({ success: false, error: "Invalid DM channel" });
      }

      if (!channel.isMember(user._id)) {
        return ack?.({ success: false, error: "Not a participant of this DM" });
      }

      const message = await Message.create({
        channel: channelId,
        sender:  user._id,
        text,
        attachments,
      });

      // Update DM last message preview
      await DirectMessage.findOneAndUpdate(
        { channel: channelId },
        {
          lastMessage:    { text, sender: user._id, sentAt: new Date() },
          lastActivityAt: new Date(),
        }
      );

      const populated = await message.populate(
        "sender",
        "displayName avatar avatarColor username"
      );

      // Emit to the DM room (both participants if both connected)
      io.to(`channel:${channelId}`).emit("dm:message", populated);

      // Push notification to the other participant's personal room
      channel.members.forEach(({ user: memberId }) => {
        if (memberId.toString() !== user._id.toString()) {
          io.to(`user:${memberId}`).emit("notification:dm", {
            message: populated,
            channelId,
          });
        }
      });

      ack?.({ success: true, message: populated });
    } catch (err) {
      console.error("[dm:send]", err);
      ack?.({ success: false, error: "Failed to send DM" });
    }
  });

  // ── Mark DM as read ─────────────────────────────────────────────────────────
  socket.on("dm:mark_read", async ({ channelId, messageId }, ack) => {
    try {
      const dm = await DirectMessage.findOne({ channel: channelId });
      if (!dm) return ack?.({ success: false, error: "DM not found" });

      await dm.markRead(user._id, messageId);

      io.to(`user:${user._id}`).emit("dm:read_updated", { channelId });
      ack?.({ success: true });
    } catch (err) {
      console.error("[dm:mark_read]", err);
      ack?.({ success: false, error: "Failed to mark DM as read" });
    }
  });

  // ── Typing indicators ───────────────────────────────────────────────────────
  socket.on("dm:typing", ({ channelId }) => {
    socket.to(`channel:${channelId}`).emit("dm:typing", {
      userId:      user._id,
      displayName: user.displayName,
    });
  });

  socket.on("dm:stop_typing", ({ channelId }) => {
    socket.to(`channel:${channelId}`).emit("dm:stop_typing", {
      userId: user._id,
    });
  });
};