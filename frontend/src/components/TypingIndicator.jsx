export function TypingIndicator({ users = [] }) {
  if (!users.length) return null;
 
  const label =
    users.length === 1
      ? `${users[0]} is typing`
      : users.length === 2
      ? `${users[0]} and ${users[1]} are typing`
      : `${users[0]} and ${users.length - 1} others are typing`;
 
  return (
    <div className="flex items-center gap-1.5 pl-0.5 min-h-6">
      <div className="flex items-center gap-0.5">
        <span className="typing-dot" style={{ animationDelay: "0ms" }} />
        <span className="typing-dot" style={{ animationDelay: "160ms" }} />
        <span className="typing-dot" style={{ animationDelay: "320ms" }} />
      </div>
      <span className="text-xs text-slate-400 italic">{label}</span>
 
      <style>{`
        .typing-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #94a3b8;
          animation: mmBounce 1.2s infinite ease-in-out;
        }
        @keyframes mmBounce {
          0%, 80%, 100% { transform: translateY(0);    opacity: 0.4; }
          40%            { transform: translateY(-4px); opacity: 1;   }
        }
      `}</style>
    </div>
  );
}