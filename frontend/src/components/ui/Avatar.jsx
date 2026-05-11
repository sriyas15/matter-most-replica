export default function Avatar({
  user,
  size = 32,
  showStatus = false,
}) {
  const name =
    user?.displayName ||
    user?.username ||
    "Unknown";

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function getStatusColor(status) {
    switch (status) {
      case "online":
        return "#22c55e";
      case "away":
        return "#f59e0b";
      case "dnd":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  }

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          background: user?.avatarColor || "#5d5fe8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          color: "#fff",
          fontSize: size * 0.35,
          fontWeight: 500,
        }}
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          initials
        )}
      </div>

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
            background: getStatusColor(user?.status),
          }}
        />
      )}
    </div>
  );
}