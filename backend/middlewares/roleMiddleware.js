// Role hierarchy: owner > admin > member > guest
const ROLE_RANK = { owner: 4, admin: 3, member: 2, guest: 1 };

/**
 * requireRole(...roles)
 * Allows access only if the logged-in user's role is one of the provided roles.
 *
 * Usage:
 *   router.delete("/channel/:id", verifyToken, requireRole("admin", "owner"), deleteChannel);
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorised" });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(" or ")}.`,
      });
    }

    next();
  };
};

/**
 * requireMinRole(minRole)
 * Allows access if the user's role rank is >= the specified minimum.
 *
 * Usage:
 *   router.patch("/user/:id", verifyToken, requireMinRole("admin"), updateUser);
 */
export const requireMinRole = (minRole) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorised" });
    }

    const userRank = ROLE_RANK[user.role] ?? 0;
    const minRank  = ROLE_RANK[minRole]   ?? 0;

    if (userRank < minRank) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Minimum required role: ${minRole}.`,
      });
    }

    next();
  };
};

/**
 * requireOwnerOrSelf
 * Allows owners/admins OR the user themselves to proceed.
 * Expects req.params.userId to be the target user.
 *
 * Usage:
 *   router.patch("/user/:userId", verifyToken, requireOwnerOrSelf, updateProfile);
 */
export const requireOwnerOrSelf = (req, res, next) => {
  const { user }   = req;
  const targetId   = req.params.userId;

  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorised" });
  }

  const isSelf     = user._id.toString() === targetId;
  const isElevated = ["owner", "admin"].includes(user.role);

  if (!isSelf && !isElevated) {
    return res.status(403).json({
      success: false,
      error: "You can only modify your own profile.",
    });
  }

  next();
};