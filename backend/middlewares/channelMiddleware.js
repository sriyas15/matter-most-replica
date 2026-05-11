import Channel from "../models/Channel.js";

/**
 * verifyChannelAccess
 * Attaches req.channel and verifies the user is a member.
 * Must run after verifyToken.
 *
 * Usage:
 *   router.get("/:channelId/messages", verifyToken, verifyChannelAccess, getMessages);
 */
export const verifyChannelAccess = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ success: false, error: "Channel not found." });
    }

    if (channel.isArchived) {
      return res.status(403).json({ success: false, error: "This channel is archived." });
    }

    // Public channels are readable by everyone; private/direct/group require membership
    const isPublic = channel.type === "public";
    const isMember = channel.isMember(req.user._id);

    if (!isPublic && !isMember) {
      return res.status(403).json({
        success: false,
        error: "You are not a member of this channel.",
      });
    }

    req.channel = channel;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * verifyChannelMember
 * Stricter version — user MUST be a member regardless of channel type.
 *
 * Usage:
 *   router.post("/:channelId/messages", verifyToken, verifyChannelMember, sendMessage);
 */
export const verifyChannelMember = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ success: false, error: "Channel not found." });
    }

    if (channel.isArchived) {
      return res.status(403).json({ success: false, error: "This channel is archived." });
    }

    if (!channel.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        error: "You are not a member of this channel.",
      });
    }

    if (channel.isReadOnly) {
      const memberRole = channel.getMemberRole(req.user._id);
      const canWrite   = ["owner", "admin"].includes(req.user.role) || memberRole === "admin";

      if (!canWrite) {
        return res.status(403).json({
          success: false,
          error: "This channel is read-only.",
        });
      }
    }

    req.channel = channel;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * verifyChannelAdmin
 * Only channel admins, workspace admins, or owners may proceed.
 * Must run after verifyChannelMember (requires req.channel).
 *
 * Usage:
 *   router.patch("/:channelId", verifyToken, verifyChannelMember, verifyChannelAdmin, updateChannel);
 */
export const verifyChannelAdmin = (req, res, next) => {
  const { user, channel } = req;

  if (!channel) {
    return res.status(500).json({ success: false, error: "Channel not loaded. Run verifyChannelMember first." });
  }

  const isWorkspaceElevated = ["owner", "admin"].includes(user.role);
  const isChannelAdmin      = channel.getMemberRole(user._id) === "admin";

  if (!isWorkspaceElevated && !isChannelAdmin) {
    return res.status(403).json({
      success: false,
      error: "Only channel admins can perform this action.",
    });
  }

  next();
};