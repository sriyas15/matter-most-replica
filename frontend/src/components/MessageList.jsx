import { useEffect, useRef, useCallback } from "react";
import MessageItem from "./MessageItem";
import TypingIndicator from "./TypingIndicator";
import { useChat } from "../context/ChatContext";

export default function MessageList() {
  const { messages, typingUsers, hasMore, loadingMsgs, loadMoreMessages } = useChat();
  const bottomRef = useRef(null);
  const topRef = useRef(null);
  const listRef = useRef(null);
  const prevCountRef = useRef(0);

  // Scroll to bottom on new messages (not on loading older ones)
  useEffect(() => {
    const newCount = messages.length;
    const added = newCount - prevCountRef.current;
    prevCountRef.current = newCount;

    // Only auto-scroll if user added a message (last item) or it's initial load
    if (added === 1 || prevCountRef.current === newCount) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Infinite scroll — load older messages when scrolling to top
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop < 80 && hasMore && !loadingMsgs) {
      const prevHeight = el.scrollHeight;
      loadMoreMessages().then(() => {
        // Preserve scroll position after prepend
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevHeight;
        });
      });
    }
  }, [hasMore, loadingMsgs, loadMoreMessages]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div ref={listRef} style={styles.container}>
      {/* Load more indicator */}
      {loadingMsgs && messages.length > 0 && (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <span style={{ fontSize: 11, color: "#6060a0" }}>Loading older messages…</span>
        </div>
      )}

      {/* Empty state */}
      {!loadingMsgs && messages.length === 0 && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#5050a0", fontSize: 13 }}>No messages yet. Say hello! 👋</p>
        </div>
      )}

      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const isConsecutive =
          prev &&
          prev.sender?._id === msg.sender?._id &&
          new Date(msg.createdAt) - new Date(prev.createdAt) < 5 * 60 * 1000; // within 5 min
        return (
          <MessageItem key={msg._id || msg.id} message={msg} isConsecutive={isConsecutive} />
        );
      })}

      {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
      <div ref={bottomRef} />
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(255,255,255,0.1) transparent",
  },
};