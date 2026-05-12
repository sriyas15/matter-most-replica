import { useState, useRef, useEffect } from "react";
import { useDM }   from "../context/DMContext";
import { useAuth } from "../context/AuthContext";

const STATUS_COLOR = {
  online:  "bg-emerald-500",
  away:    "bg-amber-400",
  dnd:     "bg-red-500",
  offline: "bg-slate-400",
};

const STATUS_TEXT = {
  online:  "text-emerald-600",
  away:    "text-amber-500",
  dnd:     "text-red-500",
  offline: "text-slate-400",
};

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
    <div className="flex items-center gap-2 my-2.5 select-none">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderText(raw = "") {
  const parts = raw.split(/(`[^`]+`)/g);
  return parts.map((part, i) =>
    part.startsWith("`") && part.endsWith("`")
      ? <code key={i} className="bg-blue-50 px-1 py-0.5 rounded text-[11px] font-mono text-blue-700 border border-blue-100">{part.slice(1, -1)}</code>
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
  const otherName     = other.displayName || other.username || "DM";
  const otherInitials = otherName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const statusDot     = STATUS_COLOR[other.status || "offline"];
  const statusText    = STATUS_TEXT[other.status || "offline"];

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

  // Build items with date separators
  const items = [];
  let lastDayKey = null;

  for (let i = 0; i < dmMessages.length; i++) {
    const msg     = dmMessages[i];
    const dateStr = msg.createdAt;
    const dayKey  = getDayKey(dateStr);

    if (dayKey !== lastDayKey) {
      items.push({ type: "separator", key: `sep-${dayKey}`, label: getDayLabel(dateStr) });
      lastDayKey = dayKey;
    }

    const prev        = dmMessages[i - 1];
    const prevDateStr = prev?.createdAt;
    const isMine      = (msg.sender?._id || msg.sender) === me?._id;
    const isConsecutive =
      prev &&
      getDayKey(prevDateStr) === dayKey &&
      (prev.sender?._id || prev.sender) === (msg.sender?._id || msg.sender) &&
      new Date(dateStr) - new Date(prevDateStr) < 5 * 60 * 1000;

    items.push({ type: "message", key: msg._id, msg, isMine, isConsecutive });
  }

  const canSend = text.trim() && !sending;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[59]" onClick={closeDM} />

      {/* Panel */}
      <div
        className="fixed bottom-6 right-6 w-[360px] h-[500px] z-[60] bg-white border border-slate-200 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-slate-100 bg-white flex-shrink-0">
          <div className="relative flex-shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-semibold text-white overflow-hidden"
              style={{ background: other.avatarColor || "#2563eb" }}
            >
              {other.avatar
                ? <img src={other.avatar} alt="" className="w-full h-full object-cover" />
                : otherInitials}
            </div>
            <div className={`w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white ${statusDot}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-slate-800 truncate">{otherName}</div>
            <div className={`text-[11px] capitalize ${statusText}`}>{other.status || "offline"}</div>
          </div>

          <button
            onClick={closeDM}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-lg flex items-center p-1 rounded-md border-none bg-transparent cursor-pointer transition-colors"
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1.5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,0,0,0.08) transparent" }}>
          {loadingMsgs && (
            <div className="flex items-center justify-center py-5">
              <span className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
            </div>
          )}

          {!loadingMsgs && dmMessages.length === 0 && (
            <div className="flex-1 flex items-center justify-center flex-col gap-2 opacity-50">
              <div className="text-3xl">💬</div>
              <p className="text-[12px] text-slate-400">Start a conversation with {otherName}</p>
            </div>
          )}

          {items.map((item) => {
            if (item.type === "separator")
              return <DateSeparator key={item.key} label={item.label} />;

            const { msg, isMine, isConsecutive } = item;
            const senderUser = msg.sender || {};
            const sName  = senderUser.displayName || senderUser.username || "Unknown";
            const sInit  = sName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

            return (
              <div
                key={msg._id}
                className={`flex gap-1.5 items-end ${isMine ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar spacer */}
                {!isConsecutive && !isMine ? (
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 overflow-hidden"
                    style={{ background: senderUser.avatarColor || "#2563eb" }}
                  >
                    {senderUser.avatar
                      ? <img src={senderUser.avatar} alt="" className="w-full h-full object-cover" />
                      : sInit}
                  </div>
                ) : !isMine ? (
                  <div className="w-6 flex-shrink-0" />
                ) : null}

                <div className="max-w-[72%]">
                  <div
                    className={`px-3 py-1.5 text-[13px] leading-relaxed break-words ${
                      isMine
                        ? "bg-blue-600 text-white rounded-xl rounded-br-sm"
                        : "bg-slate-100 text-slate-700 rounded-xl rounded-bl-sm"
                    }`}
                  >
                    {renderText(msg.text)}
                  </div>
                  <div className={`text-[10px] text-slate-400 mt-0.5 ${isMine ? "text-right" : "text-left"}`}>
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
        <div className="px-3 pb-3 pt-2 flex-shrink-0 bg-white border-t border-slate-100">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${otherName}…`}
              rows={1}
              disabled={sending}
              className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-2.5 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none resize-none font-inherit leading-snug max-h-20 overflow-y-auto transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`flex items-center justify-center rounded-lg px-3 py-2 text-[15px] text-white border-none flex-shrink-0 transition-colors ${
                canSend ? "bg-blue-600 hover:bg-blue-700 cursor-pointer" : "bg-blue-300 cursor-not-allowed"
              }`}
            >
              {sending
                ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <i className="ti ti-send" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}