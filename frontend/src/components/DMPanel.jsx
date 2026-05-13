import { useState, useRef, useEffect, useCallback } from "react";
import { useDM }          from "../context/DMContext";
import { useAuth }        from "../context/AuthContext";
import { useWorkspace }   from "../context/WorkspaceContext";
import api                from "../lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_MB    = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ACCEPTED_TYPES = [
  "image/png","image/jpg","image/jpeg","image/gif","image/webp",
  "video/mp4","video/webm","video/ogg",
  "audio/mpeg","audio/wav","audio/ogg",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword","text/plain",
];

const ACCEPT_ATTR = ["image/*","video/*","audio/*",".pdf",".doc",".docx",".txt"].join(",");

// ─── Emoji ────────────────────────────────────────────────────────────────────

const EMOJI_CATEGORIES = [
  { label: "Smileys",  emojis: ["😀","😂","😍","😎","🥳","😭","😅","🤔","😴","🤯","😡","🥺","😇","🤩","😏","😬","😱","🤗","😑","🙄"] },
  { label: "Gestures", emojis: ["👍","👎","👌","✌️","🤞","👏","🙌","🤝","👋","🤙","💪","🙏","☝️","👉","👈","🤘","🖐️","✋","👊","🤜"] },
  { label: "Objects",  emojis: ["🔥","💡","🎉","🎊","💯","⭐","✨","💥","❤️","💔","💬","📎","📌","🔗","🔒","🔑","📝","💻","📱","🎵"] },
  { label: "Nature",   emojis: ["🌟","🌈","☀️","🌙","⚡","🌊","🌸","🌺","🍀","🦋","🐶","🐱","🦊","🐻","🦁","🐸","🌵","🍕","🍔","🎂"] },
];

function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 mb-1 w-[280px] bg-white border border-slate-200 rounded-xl shadow-xl z-[70] overflow-hidden"
    >
      <div className="max-h-[220px] overflow-y-auto p-2" style={{ scrollbarWidth: "thin" }}>
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.label} className="mb-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-1 mb-1">
              {cat.label}
            </p>
            <div className="flex flex-wrap gap-0.5">
              {cat.emojis.map((e) => (
                <button
                  key={e}
                  onClick={() => onSelect(e)}
                  className="w-7 h-7 flex items-center justify-center text-[16px] rounded hover:bg-slate-100 border-none bg-transparent cursor-pointer transition-colors"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── File helpers ─────────────────────────────────────────────────────────────

const getFileCategory = (type) => {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "doc";
};

const FILE_ACCENT = {
  image: "border-sky-400/40 bg-sky-50",
  video: "border-violet-400/40 bg-violet-50",
  audio: "border-emerald-400/40 bg-emerald-50",
  doc:   "border-amber-400/40 bg-amber-50",
};

const FILE_ICON_CLASS = { image: "ti-photo", video: "ti-video", audio: "ti-music", doc: "ti-file-text" };
const FILE_ICON_COLOR = { image: "text-sky-500", video: "text-violet-500", audio: "text-emerald-500", doc: "text-amber-500" };
const formatSize = (b) => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`;

// ─── Attachment renderer (for received messages) ──────────────────────────────

function MessageAttachments({ attachments = [] }) {
  if (!attachments.length) return null;
  return (
    <div className="flex flex-col gap-1 mt-1">
      {attachments.map((att, i) => {
        if (att.type === "image") {
          return (
            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
              <img
                src={att.url}
                alt={att.filename || "image"}
                className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-slate-200"
              />
            </a>
          );
        }
        if (att.type === "video") {
          return (
            <video key={i} src={att.url} controls className="max-w-[200px] rounded-lg border border-slate-200">
              Your browser does not support video.
            </video>
          );
        }
        if (att.type === "audio") {
          return (
            <audio key={i} src={att.url} controls className="w-full max-w-[220px]">
              Your browser does not support audio.
            </audio>
          );
        }
        // Document / generic file
        return (
          <a
            key={i}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] text-blue-600 hover:bg-blue-50 transition-colors max-w-[200px]"
          >
            <i className="ti ti-file-text text-[13px]" />
            <span className="truncate">{att.filename || "File"}</span>
          </a>
        );
      })}
    </div>
  );
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const STATUS_COLOR = { online: "bg-emerald-500", away: "bg-amber-400", dnd: "bg-red-500", offline: "bg-slate-400" };
const STATUS_TEXT  = { online: "text-emerald-600", away: "text-amber-500", dnd: "text-red-500", offline: "text-slate-400" };

function getDayKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function getDayLabel(dateStr) {
  const msg  = new Date(dateStr);
  const now  = new Date();
  const msgDay = new Date(msg.getFullYear(), msg.getMonth(), msg.getDate());
  const today  = new Date(now.getFullYear(),  now.getMonth(),  now.getDate());
  const diff   = Math.round((today - msgDay) / 86400000);
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function DMPanel() {
  const { activeDM, dmMessages, sendDMMessage, closeDM, loadingMsgs } = useDM();
  const { user: me }        = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [text, setText]               = useState("");
  const [sending, setSending]         = useState(false);
  const [showEmoji, setShowEmoji]     = useState(false);
  const [pendingFile, setPendingFile]  = useState(null);
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const [uploading, setUploading]     = useState(false);

  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dmMessages]);

  useEffect(() => {
    if (activeDM) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setText("");
    }
  }, [activeDM?._id]);

  // Cleanup blob URL
  useEffect(() => {
    return () => { if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl); };
  }, [pendingFile]);

  if (!activeDM) return null;

  const other = activeDM.participants?.find(
    (p) => (p.user?._id || p.user) !== me?._id
  )?.user || {};
  const otherName     = other.displayName || other.username || "DM";
  const otherInitials = otherName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const statusDot     = STATUS_COLOR[other.status || "offline"];
  const statusText    = STATUS_TEXT[other.status || "offline"];

  // ── File handling ───────────────────────────────────────────────────────────

  const clearFile = () => {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
    setUploadedFileId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > MAX_FILE_SIZE_BYTES) { alert(`File exceeds the ${MAX_FILE_SIZE_MB} MB limit.`); return; }
    if (!ACCEPTED_TYPES.includes(file.type)) { alert("Unsupported file type."); return; }

    const previewUrl = URL.createObjectURL(file);
    setPendingFile({ file, name: file.name, size: file.size, type: file.type, category: getFileCategory(file.type), previewUrl });
    setUploadedFileId(null);

    if (!activeWorkspace?._id) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post(
        `/workspaces/${activeWorkspace._id}/files`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setUploadedFileId(data.data._id);
    } catch (err) {
      console.error("File upload failed:", err);
      alert("File upload failed. Please try again.");
      clearFile();
    } finally {
      setUploading(false);
    }
  };

  // ── Emoji ───────────────────────────────────────────────────────────────────

  const handleEmojiSelect = useCallback((emoji) => {
    const ta = inputRef.current;
    if (!ta) { setText((v) => v + emoji); setShowEmoji(false); return; }
    const { selectionStart: start, selectionEnd: end, value: v } = ta;
    const next = v.slice(0, start) + emoji + v.slice(end);
    setText(next);
    setShowEmoji(false);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }, []);

  // ── Send ────────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !uploadedFileId) || sending || uploading) return;
    setSending(true);
    try {
      await sendDMMessage(trimmed, uploadedFileId ? [uploadedFileId] : []);
      setText("");
      clearFile();
      inputRef.current?.focus();
    } catch {}
    finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Build message list ──────────────────────────────────────────────────────

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

    const prev          = dmMessages[i - 1];
    const prevDateStr   = prev?.createdAt;
    const isMine        = (msg.sender?._id || msg.sender) === me?._id;
    const isConsecutive = prev &&
      getDayKey(prevDateStr) === dayKey &&
      (prev.sender?._id || prev.sender) === (msg.sender?._id || msg.sender) &&
      new Date(dateStr) - new Date(prevDateStr) < 5 * 60 * 1000;

    items.push({ type: "message", key: msg._id, msg, isMine, isConsecutive });
  }

  const canSend = (text.trim() || uploadedFileId) && !sending && !uploading;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[59]" onClick={closeDM} />

      {/* Panel */}
      <div
        className="fixed bottom-6 right-6 w-[360px] h-[520px] z-[60] bg-white border border-slate-200 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
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
        <div
          className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1.5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,0,0,0.08) transparent" }}
        >
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
                  {/* Text bubble — skip if file-only */}
                  {msg.text ? (
                    <div
                      className={`px-3 py-1.5 text-[13px] leading-relaxed break-words ${
                        isMine
                          ? "bg-blue-600 text-white rounded-xl rounded-br-sm"
                          : "bg-slate-100 text-slate-700 rounded-xl rounded-bl-sm"
                      }`}
                    >
                      {renderText(msg.text)}
                    </div>
                  ) : null}

                  {/* Attachments */}
                  <MessageAttachments attachments={msg.attachments} />

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

        {/* Input area */}
        <div className="px-3 pb-3 pt-2 flex-shrink-0 bg-white border-t border-slate-100">
          {/* File preview strip */}
          {pendingFile && (
            <div className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 mb-1.5 ${FILE_ACCENT[pendingFile.category]}`}>
              <div className="w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
                {pendingFile.category === "image" ? (
                  <img src={pendingFile.previewUrl} alt="" className="w-full h-full object-cover" />
                ) : pendingFile.category === "video" ? (
                  <video src={pendingFile.previewUrl} className="w-full h-full object-cover" muted />
                ) : (
                  <i className={`ti ${FILE_ICON_CLASS[pendingFile.category]} text-sm ${FILE_ICON_COLOR[pendingFile.category]}`} />
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[11px] font-medium text-slate-700 truncate">{pendingFile.name}</span>
                <span className="text-[10px] text-slate-400">{formatSize(pendingFile.size)}</span>
              </div>
              {uploading ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin flex-shrink-0" />
              ) : (
                <button onClick={clearFile} className="text-slate-400 hover:text-red-500 border-none bg-transparent cursor-pointer p-0">
                  <i className="ti ti-x text-[11px]" />
                </button>
              )}
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-1.5 items-end">
            {/* Emoji */}
            <div className="relative flex-shrink-0 self-end mb-1">
              <button
                type="button"
                onClick={() => setShowEmoji((p) => !p)}
                title="Emoji"
                className={`w-6 h-6 flex items-center justify-center text-[14px] rounded border-none bg-transparent cursor-pointer transition-colors ${
                  showEmoji ? "text-blue-600" : "text-slate-400 hover:text-blue-500"
                }`}
              >
                <i className="ti ti-mood-smile" />
              </button>
              {showEmoji && (
                <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
              )}
            </div>

            {/* Attach */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!!pendingFile}
              title={`Attach file · max ${MAX_FILE_SIZE_MB} MB`}
              className={`w-6 h-6 flex-shrink-0 self-end mb-1 flex items-center justify-center text-[14px] rounded border-none bg-transparent cursor-pointer transition-colors ${
                pendingFile ? "text-blue-600" : "text-slate-400 hover:text-blue-500"
              }`}
            >
              <i className="ti ti-paperclip" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Textarea */}
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

            {/* Send */}
            <button
              type="button"
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