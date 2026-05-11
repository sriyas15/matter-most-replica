import Message from "../../models/Message.js";
import Channel from "../../models/Channel.js";

/**
 * Events handled:
 *  message:send       → broadcast new message to channel room
 *  message:edit       → broadcast edited message
 *  message:delete     → broadcast soft-deleted message
 *  message:react      → toggle reaction, broadcast updated reactions
 *  message:pin        → pin/unpin, notify channel
 *  channel:join       → join socket room for a channel
 *  channel:leave      → leave socket room for a channel
 *  message:typing     → forward typing indicator to channel room
 *  message:stop_typing→ forward stop-typing to channel room
 */
export const registerMessageHandlers = (io, socket) => {
  const { user } = socket;

  // ── Send message ────────────────────────────────────────────────────────────
  socket.on("message:send", async (data, ack) => {
    try {
      const { channelId, text, attachments = [], parentMessageId = null } = data;

      const channel = await Channel.findById(channelId);
      if (!channel || !channel.isMember(user._id)) {
        return ack?.({ success: false, error: "Not a channel member" });
      }

      const mentionHandles = [...(text.matchAll(/@([a-zA-Z0-9_.-]+)/g))].map(
        (m) => m[1]
      );

      const message = await Message.create({
        channel: channelId,
        sender: user._id,
        text,
        attachments,
        parentMessage: parentMessageId ?? null,
      });

      if (parentMessageId) {
        await Message.incrementReplyStats(parentMessageId, user._id);
      }

      await Channel.findByIdAndUpdate(channelId, {
        lastMessage: { text, sender: user._id, sentAt: new Date() },
        lastActivityAt: new Date(),
      });

      const populated = await message.populate([
        { path: "sender", select: "displayName avatar avatarColor username" },
        { path: "attachments.fileRef" },
      ]);

      io.to(`channel:${channelId}`).emit("message:new", populated);

      if (mentionHandles.length) {
        const User = (await import("../../models/User.js")).default;
        const mentioned = await User.find({
          username: { $in: mentionHandles },
        }).select("_id");

        mentioned.forEach(({ _id }) => {
          if (_id.toString() !== user._id.toString()) {
            io.to(`user:${_id}`).emit("notification:mention", {
              message: populated,
              channelId,
            });
          }
        });
      }

      ack?.({ success: true, message: populated });
    } catch (err) {
      console.error("[message:send]", err);
      ack?.({ success: false, error: "Failed to send message" });
    }
  });

  // ── Edit message ────────────────────────────────────────────────────────────
  socket.on("message:edit", async (data, ack) => {
    try {
      const { messageId, text } = data;

      const message = await Message.findById(messageId);
      if (!message) return ack?.({ success: false, error: "Message not found" });
      if (message.sender.toString() !== user._id.toString()) {
        return ack?.({ success: false, error: "Cannot edit someone else's message" });
      }

      message.text = text;
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      io.to(`channel:${message.channel}`).emit("message:updated", {
        messageId,
        text,
        isEdited: true,
        editedAt: message.editedAt,
      });

      ack?.({ success: true });
    } catch (err) {
      console.error("[message:edit]", err);
      ack?.({ success: false, error: "Failed to edit message" });
    }
  });

  // ── Delete message ──────────────────────────────────────────────────────────
  socket.on("message:delete", async (data, ack) => {
    try {
      const { messageId } = data;

      const message = await Message.findById(messageId);
      if (!message) return ack?.({ success: false, error: "Message not found" });

      const isOwner = message.sender.toString() === user._id.toString();
      const isElevated = ["owner", "admin"].includes(user.role);

      if (!isOwner && !isElevated) {
        return ack?.({ success: false, error: "Cannot delete this message" });
      }

      await message.softDelete();

      io.to(`channel:${message.channel}`).emit("message:deleted", { messageId });
      ack?.({ success: true });
    } catch (err) {
      console.error("[message:delete]", err);
      ack?.({ success: false, error: "Failed to delete message" });
    }
  });

  // ── React ───────────────────────────────────────────────────────────────────
  socket.on("message:react", async (data, ack) => {
    try {
      const { messageId, emoji } = data;

      const message = await Message.findById(messageId);
      if (!message) return ack?.({ success: false, error: "Message not found" });

      await message.toggleReaction(emoji, user._id);

      io.to(`channel:${message.channel}`).emit("message:reaction_updated", {
        messageId,
        reactions: message.reactions,
      });

      ack?.({ success: true, reactions: message.reactions });
    } catch (err) {
      console.error("[message:react]", err);
      ack?.({ success: false, error: "Failed to toggle reaction" });
    }
  });

  // ── Pin / unpin ─────────────────────────────────────────────────────────────
  socket.on("message:pin", async (data, ack) => {
    try {
      const { messageId, pin } = data;

      const message = await Message.findById(messageId);
      if (!message) return ack?.({ success: false, error: "Message not found" });

      message.isPinned = pin;
      await message.save();

      const update = pin
        ? { $addToSet: { pinnedMessages: messageId } }
        : { $pull: { pinnedMessages: messageId } };
      await Channel.findByIdAndUpdate(message.channel, update);

      io.to(`channel:${message.channel}`).emit("message:pin_updated", {
        messageId,
        isPinned: pin,
        pinnedBy: user._id,
      });

      ack?.({ success: true });
    } catch (err) {
      console.error("[message:pin]", err);
      ack?.({ success: false, error: "Failed to pin message" });
    }
  });

  // ── Channel room management ─────────────────────────────────────────────────
  socket.on("channel:join", async ({ channelId }, ack) => {
    try {
      const channel = await Channel.findById(channelId);
      if (!channel || !channel.isMember(user._id)) {
        return ack?.({ success: false, error: "Not a channel member" });
      }
      socket.join(`channel:${channelId}`);
      ack?.({ success: true });
    } catch (err) {
      console.error("[channel:join]", err);
      ack?.({ success: false, error: "Failed to join channel" });
    }
  });

  socket.on("channel:leave", ({ channelId }) => {
    socket.leave(`channel:${channelId}`);
  });

  // ── Typing indicators ───────────────────────────────────────────────────────
  socket.on("message:typing", ({ channelId }) => {
    socket.to(`channel:${channelId}`).emit("message:typing", {
      userId: user._id,
      displayName: user.displayName || user.username || "Someone",
      channelId,
    });
  });

  socket.on("message:stop_typing", ({ channelId }) => {
    socket.to(`channel:${channelId}`).emit("message:stop_typing", {
      userId: user._id,
      channelId,
    });
  });
};