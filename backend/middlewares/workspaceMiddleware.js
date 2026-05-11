import Workspace from "../models/Workspace.js";

// ── Attach workspace + verify membership ─────────────────────────────────────
export const requireWorkspaceMember = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId;
    if (!workspaceId) return next();   // non-workspace routes pass through

    const workspace = await Workspace.findById(workspaceId).select("members owner isArchived");
    if (!workspace)
      return res.status(404).json({ success: false, message: "Workspace not found" });

    if (!workspace.isMember(req.user._id))
      return res.status(403).json({ success: false, message: "Not a member of this workspace" });

    // Attach for downstream use
    req.workspace          = workspace;
    req.userWorkspaceRole  = workspace.getMemberRole(req.user._id);
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Require a minimum role ────────────────────────────────────────────────────
const ROLE_RANK = { guest: 0, member: 1, admin: 2, owner: 3 };

export const requireWorkspaceRole = (minRole) => async (req, res, next) => {
  await requireWorkspaceMember(req, res, () => {
    const userRank = ROLE_RANK[req.userWorkspaceRole] ?? -1;
    const minRank  = ROLE_RANK[minRole] ?? 99;

    if (userRank < minRank)
      return res.status(403).json({
        success: false,
        message: `Requires ${minRole} role or higher`,
      });

    next();
  });
};