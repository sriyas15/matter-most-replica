import { useEffect, useRef, useCallback } from "react";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import MessageItem from "./MessageItem";

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
  if (msg.getFullYear() === now.getFullYear())
    return msg.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  return msg.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function DateSeparator({ label }) {
  return (
    <div className="flex items-center gap-3 my-3 px-1 select-none">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap px-1">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

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
            className="w-[5px] h-[5px] rounded-full bg-blue-500 opacity-70 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
          />
        ))}
      </span>
      <span className="text-[11px] text-slate-400 italic">{label}</span>
    </div>
  );
}

export default function MessageList() {
  const { messages, typingUsers, hasMore, loadingMsgs, loadMoreMessages } = useChat();
  const { user } = useAuth();
  const bottomRef    = useRef(null);
  const containerRef = useRef(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const added = messages.length - prevCountRef.current;
      if (added <= 2 || prevCountRef.current === 0) {
        bottomRef.current?.scrollIntoView({ behavior: prevCountRef.current === 0 ? "instant" : "smooth" });
      }
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    if (containerRef.current.scrollTop < 80 && hasMore && !loadingMsgs) {
      const prevHeight = containerRef.current.scrollHeight;
      loadMoreMessages().then(() => {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop =
              containerRef.current.scrollHeight - prevHeight;
          }
        });
      });
    }
  }, [hasMore, loadingMsgs, loadMoreMessages]);

  const items = [];
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
      className="flex-1 overflow-y-auto px-4 py-2 flex flex-col bg-white"
      style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,0,0,0.08) transparent" }}
    >
      {/* Load more spinner */}
      {loadingMsgs && (
        <div className="flex justify-center py-3">
          <span className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loadingMsgs && messages.length === 0 && (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 opacity-50">
          <div className="text-5xl">💬</div>
          <p className="text-[13px] text-slate-400">No messages yet. Say hello!</p>
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