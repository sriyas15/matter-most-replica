export default function TypingIndicator({ users = [] }) {
  if (!users.length) return null;

  const label =
    users.length === 1
      ? `${users[0]} is typing`
      : users.length === 2
      ? `${users[0]} and ${users[1]} are typing`
      : `${users[0]} and ${users.length - 1} others are typing`;

  return (
    <div style={styles.wrapper}>
      <div style={styles.dots}>
        <span style={{ ...styles.dot, animationDelay: "0ms" }} />
        <span style={{ ...styles.dot, animationDelay: "160ms" }} />
        <span style={{ ...styles.dot, animationDelay: "320ms" }} />
      </div>
      <span style={styles.label}>{label}</span>
      <style>{`
        @keyframes mmBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", alignItems: "center", gap: 6, paddingLeft: 2, minHeight: 24 },
  dots: { display: "flex", alignItems: "center", gap: 3 },
  dot: { display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#7070a8", animation: "mmBounce 1.2s infinite ease-in-out" },
  label: { fontSize: 12, color: "#7070a8", fontStyle: "italic" },
};