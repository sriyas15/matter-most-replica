import { useState, useRef, useEffect } from "react";
import { useDM }    from "../context/DMContext";
import { useAuth }  from "../context/AuthContext";

const STATUS_COLOR = { online: "#3db87a", away: "#f0a22a", dnd: "#e53e3e", offline: "#6060a0" };

// ── Date helpers ──────────────────────────────────────────────────────────────
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
  if (msg.getFullYear() === now.getFullYear()) {
    return msg.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }
  return msg.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function DateSeparator({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0", userSelect: "none" }}>
      <div style={{ flex: 1, height: 0.5, background: "rgba(255,255,255,0.08)" }} />
      <span style={{ fontSize: 10, fontWeight: 500, color: "#5050a0", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 0.5, background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}

// ── Existing helpers ──────────────────────────────────────────────────────────
function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderText(raw = "") {
  const parts = raw.split(/(`[^`]+`)/g);
  return parts.map((part, i) =>
    part.startsWith("`") && part.endsWith("`")
      ? <code key={i} style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 3, fontFamily: "monospace", fontSize: 12, color: "#c0c0e0" }}>{part.slice(1, -1)}</code>
      : part
  );
}

export default function DMPanel() {
  const { activeDM, dmMessages, sendDMMessage, closeDM, loadingMsgs } = useDM();
  const { user: me } = useAuth();
  const [text, setText]       = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages]);

  useEffect(() => {
    if (activeDM) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setText("");
    }
  }, [activeDM?._id]);

  if (!activeDM) return null;

  const other = activeDM.participants?.find(
    (p) => (p.user?._id || p.user) !== me?._id
  )?.user || {};
  const otherName = other.displayName || other.username || "DM";
  const otherInitials = otherName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await sendDMMessage(trimmed);
      setText("");
      inputRef.current?.focus();
    } catch {}
    finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Build items list with date separators ───────────────────────────────────
  const items = [];
  let lastDayKey = null;

  for (let i = 0; i < dmMessages.length; i++) {
    const msg = dmMessages[i];
    const dateStr = msg.createdAt;
    const dayKey  = getDayKey(dateStr);

    if (dayKey !== lastDayKey) {
      items.push({ type: "separator", key: `sep-${dayKey}`, label: getDayLabel(dateStr) });
      lastDayKey = dayKey;
    }

    const prev = dmMessages[i - 1];
    const prevDateStr = prev?.createdAt;
    const isMine = (msg.sender?._id || msg.sender) === me?._id;
    const isConsecutive =
      prev &&
      getDayKey(prevDateStr) === dayKey &&
      (prev.sender?._id || prev.sender) === (msg.sender?._id || msg.sender) &&
      new Date(dateStr) - new Date(prevDateStr) < 5 * 60 * 1000;

    items.push({ type: "message", key: msg._id, msg, isMine, isConsecutive });
  }

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 59 }} onClick={closeDM} />

      <div
        style={{
          position: "fixed", bottom: 24, right: 24,
          width: 360, height: 500, zIndex: 60,
          background: "#1e1e2e",
          border: "0.5px solid rgba(255,255,255,0.12)",
          borderRadius: 14,
          display: "flex", flexDirection: "column",
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "12px 14px",
          borderBottom: "0.5px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0, background: "#252538",
        }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: other.avatarColor || "#5d5fe8",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden",
            }}>
              {other.avatar
                ? <img src={other.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : otherInitials}
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: STATUS_COLOR[other.status || "offline"],
              position: "absolute", bottom: -1, right: -1,
              border: "1.5px solid #252538",
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#d8d8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {otherName}
            </div>
            <div style={{ fontSize: 11, color: STATUS_COLOR[other.status || "offline"], textTransform: "capitalize" }}>
              {other.status || "offline"}
            </div>
          </div>

          <button onClick={closeDM} style={{ background: "none", border: "none", color: "#5050a0", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center" }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {loadingMsgs && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <span style={{ fontSize: 12, color: "#5050a0" }}>Loading…</span>
            </div>
          )}
          {!loadingMsgs && dmMessages.length === 0 && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, opacity: 0.5 }}>
              <div style={{ fontSize: 32 }}>💬</div>
              <p style={{ fontSize: 12, color: "#6060a0" }}>Start a conversation with {otherName}</p>
            </div>
          )}

          {items.map((item) => {
            if (item.type === "separator") {
              return <DateSeparator key={item.key} label={item.label} />;
            }

            const { msg, isMine, isConsecutive } = item;
            const senderUser = msg.sender || {};
            const sName = senderUser.displayName || senderUser.username || "Unknown";
            const sInit = sName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

            return (
              <div key={msg._id} style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", gap: 7, alignItems: "flex-end" }}>
                {!isConsecutive && !isMine && (
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: senderUser.avatarColor || "#5d5fe8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#fff", flexShrink: 0, overflow: "hidden" }}>
                    {senderUser.avatar ? <img src={senderUser.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : sInit}
                  </div>
                )}
                {isConsecutive && !isMine && <div style={{ width: 26, flexShrink: 0 }} />}

                <div style={{ maxWidth: "72%" }}>
                  <div style={{
                    background: isMine ? "#5d5fe8" : "rgba(255,255,255,0.07)",
                    borderRadius: isMine ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    padding: "7px 11px",
                    fontSize: 13, color: isMine ? "#fff" : "#c0c0d8",
                    lineHeight: 1.5, wordBreak: "break-word",
                  }}>
                    {renderText(msg.text)}
                  </div>
                  <div style={{ fontSize: 10, color: "#4040a0", marginTop: 3, textAlign: isMine ? "right" : "left" }}>
                    {formatTime(msg.createdAt)}
                    {msg.isEdited && " · edited"}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "8px 12px 12px", flexShrink: 0, background: "#252538", borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${otherName}…`}
              rows={1}
              disabled={sending}
              style={{
                flex: 1, background: "rgba(255,255,255,0.06)",
                border: "0.5px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "8px 10px",
                fontSize: 13, color: "#d0d0f0",
                outline: "none", resize: "none",
                fontFamily: "inherit", lineHeight: 1.4,
                maxHeight: 80, overflowY: "auto",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              style={{
                background: text.trim() && !sending ? "#5d5fe8" : "rgba(93,95,232,0.3)",
                border: "none", borderRadius: 8, padding: "8px 12px",
                color: "#fff", cursor: text.trim() && !sending ? "pointer" : "default",
                fontSize: 15, display: "flex", alignItems: "center",
                transition: "background 0.15s", flexShrink: 0,
              }}
            >
              {sending
                ? <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                : <i className="ti ti-send" />}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}