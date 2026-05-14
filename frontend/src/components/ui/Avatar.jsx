const STATUS_COLOR = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  dnd: "bg-red-500",
  offline: "bg-gray-500",
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

  const statusColor = STATUS_COLOR[user.status] || STATUS_COLOR.offline;

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center justify-center rounded-lg overflow-visible text-white font-semibold
      ${onClick ? "cursor-pointer" : "cursor-default"}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        backgroundColor: user.avatarColor || "#5d5fe8",
      }}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt=""
          className="w-full h-full object-cover rounded-lg"
        />
      ) : (
        initials
      )}

      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-[#1a1a2a] ${statusColor}`}
          style={{
            width: size * 0.32,
            height: size * 0.32,
          }}
        />
      )}
    </div>
  );
}