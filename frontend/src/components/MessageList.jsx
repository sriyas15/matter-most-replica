import { useEffect, useRef, useCallback } from "react";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import MessageItem from "./MessageItem";

// ── Date label helpers ────────────────────────────────────────────────────────
function getDayKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function getDayLabel(dateStr) {
  const msg = new Date(dateStr);
  const now = new Date();

  const msgDay = new Date(msg.getFullYear(), msg.getMonth(), msg.getDate());
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff   = Math.round((today - msgDay) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";

  // Same year → omit year
  if (msg.getFullYear() === now.getFullYear()) {
    return msg.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }
  return msg.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

// ── Date separator component ──────────────────────────────────────────────────
function DateSeparator({ label }) {
  return (
    <div className="flex items-center gap-3 my-3 px-1 select-none">
      <div className="flex-1 h-px bg-white/8" />
      <span className="text-[11px] font-medium text-[#6060a0] whitespace-nowrap px-1">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  );
}

// ── TypingIndicator ───────────────────────────────────────────────────────────
function TypingIndicator({ users }) {
  if (!users.length) return null;
  const label =
    users.length === 1
      ? `${users[0]} is typing…`
      : users.length === 2
      ? `${users[0]} and ${users[1]} are typing…`
      : "Several people are typing…";

  return (
    <div className="flex items-center gap-2 px-4 pb-1">
      <span className="flex gap-[3px] items-end">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-[5px] h-[5px] rounded-full bg-[#5d5fe8] opacity-70 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
          />
        ))}
      </span>
      <span className="text-[11px] text-[#6060a0] italic">{label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MessageList() {
  const { messages, typingUsers, hasMore, loadingMsgs, loadMoreMessages } = useChat();
  const { user } = useAuth();
  const bottomRef    = useRef(null);
  const containerRef = useRef(null);
  const prevCountRef = useRef(0);

  // Scroll to bottom when new messages arrive (not when loading older ones)
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const added = messages.length - prevCountRef.current;
      // Only auto-scroll if the new messages are at the bottom (i.e. not a prepend)
      const isNewAtBottom =
        messages.length >= 1 &&
        messages[messages.length - 1] !== messages[prevCountRef.current - 1];
      if (added <= 2 || prevCountRef.current === 0) {
        bottomRef.current?.scrollIntoView({ behavior: prevCountRef.current === 0 ? "instant" : "smooth" });
      }
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  // Infinite scroll upward
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    if (containerRef.current.scrollTop < 80 && hasMore && !loadingMsgs) {
      const prevHeight = containerRef.current.scrollHeight;
      loadMoreMessages().then(() => {
        // Restore scroll position after prepend
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop =
              containerRef.current.scrollHeight - prevHeight;
          }
        });
      });
    }
  }, [hasMore, loadingMsgs, loadMoreMessages]);

  // ── Group messages and inject date separators ─────────────────────────────
  const items = []; // { type: "separator"|"message", ... }
  let lastDayKey = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const dateStr = msg.createdAt || msg.timestamp;
    const dayKey  = getDayKey(dateStr);

    if (dayKey !== lastDayKey) {
      items.push({ type: "separator", key: `sep-${dayKey}`, label: getDayLabel(dateStr) });
      lastDayKey = dayKey;
    }

    const prev = messages[i - 1];
    const prevDateStr = prev?.createdAt || prev?.timestamp;
    const isConsecutive =
      prev &&
      getDayKey(prevDateStr) === dayKey &&
      (prev.sender?._id || prev.sender) === (msg.sender?._id || msg.sender) &&
      new Date(dateStr) - new Date(prevDateStr) < 5 * 60 * 1000;

    items.push({ type: "message", key: msg._id, msg, isConsecutive });
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-2 flex flex-col"
      style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
    >
      {/* Load more spinner */}
      {loadingMsgs && (
        <div className="flex justify-center py-3">
          <span
            className="w-4 h-4 rounded-full border-2 border-white/20 border-t-[#5d5fe8] animate-spin"
            style={{ animationDuration: "0.7s" }}
          />
        </div>
      )}

      {/* Empty state */}
      {!loadingMsgs && messages.length === 0 && (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 opacity-50">
          <div className="text-5xl">💬</div>
          <p className="text-[13px] text-[#6060a0]">No messages yet. Say hello!</p>
        </div>
      )}

      {/* Message list with date separators */}
      {items.map((item) =>
        item.type === "separator" ? (
          <DateSeparator key={item.key} label={item.label} />
        ) : (
          <MessageItem
            key={item.key}
            message={item.msg}
            isConsecutive={item.isConsecutive}
          />
        )
      )}

      <TypingIndicator users={typingUsers} />
      <div ref={bottomRef} />
    </div>
  );
}