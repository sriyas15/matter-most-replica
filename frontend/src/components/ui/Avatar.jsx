const STATUS_COLOR = {
  online: "#22c55e",
  away: "#f59e0b",
  dnd: "#ef4444",
  offline: "#6b7280",
};

export default function Avatar({
  user,
  size = 32,
  showStatus = true,
  onClick,
}) {
  if (!user) return null;

  const initials = (user.displayName || user.username || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: 8,
        background: user.avatarColor || "#5d5fe8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 600,
        color: "#fff",
        cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
      }}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        initials
      )}

      {showStatus && (
        <span
          style={{
            position: "absolute",
            bottom: -1,
            right: -1,
            width: size * 0.32,
            height: size * 0.32,
            borderRadius: "50%",
            border: "2px solid #1a1a2a",
            background:
              STATUS_COLOR[user.status] || STATUS_COLOR.offline,
          }}
        />
      )}
    </div>
  );
}