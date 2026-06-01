import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import api from "../lib/api";
import Avatar from "./ui/Avatar";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "👀"];

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageContent({ text }) {
  const safeText =
    typeof text === "string"
      ? text
      : text?.text || text?.content || "";

  const isHTML = /<[a-z][\s\S]*>/i.test(safeText);

  if (isHTML) {
    return (
      <div
        className="text-[13px] text-slate-700 leading-relaxed break-words message-content"
        dangerouslySetInnerHTML={{ __html: safeText }}
      />
    );
  }

  const parts = safeText.split(/(`[^`]+`)/g);

  return (
    <p className="text-[13px] text-slate-700 leading-relaxed break-words">
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code
            key={i}
            className="bg-blue-50 px-1 py-0.5 rounded text-[12px] font-mono text-blue-700 border border-blue-100"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        )
      )}
    </p>
  );
}

// ─── Download helper ──────────────────────────────────────────────────────────

async function downloadFile(url, filename) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

// ─── Image attachment with hover download overlay ────────────────────────────

function AttachmentImage({ att }) {
  const [hovered, setHovered] = useState(false);
  const filename = att.filename || att.url.split("/").pop().split("?")[0] || "image";

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={att.url}
        alt={filename}
        className="max-w-[320px] max-h-[260px] rounded-lg object-cover border border-slate-200 block"
      />
      {hovered && (
        <button
          onClick={() => downloadFile(att.url, filename)}
          title={`Download ${filename}`}
          className="absolute top-2 left-3 w-7 h-7 flex items-center justify-center rounded-md bg-black/60 hover:bg-black/80 text-white border-none cursor-pointer transition-colors"
        >
          <i className="ti ti-download text-[14px]" />
        </button>
      )}
    </div>
  );
}

// ─── Attachment renderer ──────────────────────────────────────────────────────

function MessageAttachments({ attachments = [] }) {
  if (!attachments?.length) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {attachments.map((att, i) => {
        if (att.type === "image") {
          return <AttachmentImage key={i} att={att} />;
        }

        if (att.type === "video") {
          return (
            <video key={i} src={att.url} controls className="max-w-[320px] rounded-lg border border-slate-200">
              Your browser does not support video.
            </video>
          );
        }

        if (att.type === "audio") {
          return (
            <div key={i} className="flex flex-col gap-0.5">
              {att.filename && (
                <span className="text-[11px] text-slate-400 truncate max-w-[260px]">{att.filename}</span>
              )}
              <audio src={att.url} controls className="max-w-[280px]">
                Your browser does not support audio.
              </audio>
            </div>
          );
        }

        const sizeLabel = att.size
          ? att.size > 1048576
            ? `${(att.size / 1048576).toFixed(1)} MB`
            : `${(att.size / 1024).toFixed(0)} KB`
          : null;

        const filename = att.filename || att.url.split("/").pop().split("?")[0] || "download";

        return (
          <button
            key={i}
            onClick={() => downloadFile(att.url, filename)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors max-w-[280px] cursor-pointer text-left"
          >
            <i className="ti ti-file-text text-[16px] text-blue-500 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-medium text-slate-700 truncate">
                {filename}
              </span>
              {sizeLabel && <span className="text-[10px] text-slate-400">{sizeLabel}</span>}
            </div>
            <i className="ti ti-download text-[13px] text-slate-400 ml-auto flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MessageItem({ message, isConsecutive }) {
  const { user } = useAuth();
  const { activeWorkspace, activeChannel, members } = useWorkspace(); // ← added members
  const [hovered, setHovered]     = useState(false);
  const [editing, setEditing]     = useState(false);
  const [editText, setEditText]   = useState(message.text || "");
  const [reactions, setReactions] = useState(message.reactions || []);

  const isMine = message.sender?._id === user?._id || message.sender === user?._id;

  // Sender snapshot from the message payload (avatar, name, etc.)
  const sender = (message.sender && typeof message.sender === "object")
    ? message.sender
    : {};

  const senderId   = sender._id?.toString();
  const liveMember = senderId ? members?.[senderId] : null;
  const liveSender = liveMember
    ? { ...sender, status: liveMember.status }
    : sender;

  const name = sender.displayName || sender.name || sender.username || "Unknown";
  const time = formatTime(message.createdAt || message.timestamp);

  const apiBase = () =>
    `/workspaces/${activeWorkspace._id}/channels/${activeChannel._id}/messages/${message._id}`;

  const handleEdit = async () => {
    if (!editText.trim()) return;
    try {
      await api.patch(apiBase(), { text: editText });
      setEditing(false);
    } catch {}
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this message?")) return;
    try { await api.delete(apiBase()); } catch {}
  };

  const handleReact = async (emoji) => {
    try {
      const { data } = await api.post(`${apiBase()}/react`, { emoji });
      setReactions(data.data);
    } catch {}
  };

  const reactionMap = (reactions || []).reduce((acc, r) => {
    acc[r.emoji] = r;
    return acc;
  }, {});

  // ── Consecutive (grouped) message ─────────────────────────────────────────
  if (isConsecutive) {
    return (
      <div
        className="flex gap-2.5 py-0.5 hover:bg-slate-50 rounded-md px-1 transition-colors"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="w-8 shrink-0 flex items-center justify-center">
          {hovered && (
            <span className="text-[10px] text-slate-400 leading-none whitespace-nowrap">{time}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <EditBox value={editText} onChange={setEditText} onSave={handleEdit}
              onCancel={() => { setEditing(false); setEditText(message.text); }}
            />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-0.5 h-[18px]">
                {hovered && (
                  <>
                    {message.isEdited && <span className="text-[10px] text-slate-400">(edited)</span>}
                    <MessageActions
                      isMine={isMine}
                      onEdit={() => setEditing(true)}
                      onDelete={handleDelete}
                      onReact={handleReact}
                    />
                  </>
                )}
              </div>
              {message.text && <MessageContent text={message.text} />}
              <MessageAttachments attachments={message.attachments} />
            </>
          )}
          <ReactionRow reactions={reactionMap} onReact={handleReact} userId={user?._id} />
        </div>
      </div>
    );
  }

  // ── First message in a group ───────────────────────────────────────────────
  return (
    <div
      className="flex gap-2.5 py-0.5 hover:bg-slate-50 rounded-md px-1 transition-colors relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Pass liveSender so the status dot reflects current presence ── */}
      <Avatar user={liveSender} size={32} showStatus />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-slate-800">{name}</span>
          <span className="text-[11px] text-slate-400">{time}</span>
          {message.isEdited && <span className="text-[10px] text-slate-400">(edited)</span>}
          {hovered && !editing && (
            <MessageActions
              isMine={isMine}
              onEdit={() => setEditing(true)}
              onDelete={handleDelete}
              onReact={handleReact}
            />
          )}
        </div>

        {editing ? (
          <EditBox
            value={editText}
            onChange={setEditText}
            onSave={handleEdit}
            onCancel={() => { setEditing(false); setEditText(message.text); }}
          />
        ) : (
          <>
            {message.text && <MessageContent text={message.text} />}
            <MessageAttachments attachments={message.attachments} />
          </>
        )}

        <ReactionRow reactions={reactionMap} onReact={handleReact} userId={user?._id} />
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EditBox({ value, onChange, onSave, onCancel }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    el.scrollTop = el.scrollHeight;
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onCancel();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      const el = textareaRef.current;
      const pos = el.selectionStart;
      const textBeforeCursor = value.slice(0, pos);
      const currentLine = textBeforeCursor.split("\n").pop();
      const match = currentLine.match(/^(\d+)\.\s/);

      if (match) {
        e.preventDefault();
        const nextNumber = Number(match[1]) + 1;
        const insertText = `\n${nextNumber}. `;
        const newValue = value.slice(0, pos) + insertText + value.slice(pos);
        onChange(newValue);
        setTimeout(() => {
          const cursorPos = pos + insertText.length;
          el.focus();
          el.setSelectionRange(cursorPos, cursorPos);
          el.scrollTop = el.scrollHeight;
        }, 0);
        return;
      }

      e.preventDefault();
      onSave();
    }
  };

  return (
    <div>
      <textarea
        ref={textareaRef}
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full bg-white border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-md px-2.5 py-1.5 text-[13px] text-slate-800 outline-none resize-none font-inherit box-border transition-all overflow-y-auto"
        rows={2}
        style={{ minHeight: "3rem" }}
      />
      <div className="flex gap-1.5 mt-1">
        <button onClick={onSave} className="bg-blue-600 hover:bg-blue-700 text-white border-none rounded px-2.5 py-1 text-[11px] cursor-pointer font-inherit transition-colors">
          Save
        </button>
        <button onClick={onCancel} className="bg-slate-100 hover:bg-slate-200 text-slate-500 border-none rounded px-2.5 py-1 text-[11px] cursor-pointer font-inherit transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ReactionRow({ reactions, onReact, userId }) {
  const entries = Object.values(reactions);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map((r) => {
        const mine = r.users?.some((u) => (u._id || u) === userId);
        return (
          <button
            key={r.emoji}
            onClick={() => onReact(r.emoji)}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] cursor-pointer border transition-colors ${
              mine
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50"
            }`}
          >
            {r.emoji}
            <span className="text-[11px] font-medium">{r.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function MessageActions({ isMine, onEdit, onDelete, onReact }) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [dotsOpen, setDotsOpen]   = useState(false);

  return (
    <div className="flex gap-0.5 bg-white border border-slate-200 shadow-sm rounded-md px-1 py-0.5 shrink-0 self-center">
      <div className="relative">
        <ActionBtn icon="ti-mood-smile" label="React" onClick={() => { setEmojiOpen((p) => !p); setDotsOpen(false); }} />
        {emojiOpen && (
          <div className="absolute bottom-[110%] left-0 bg-white border border-slate-200 shadow-lg rounded-lg p-1.5 flex gap-0.5 z-50">
            {QUICK_EMOJIS.map((e) => (
              <button key={e} onClick={() => { onReact(e); setEmojiOpen(false); }}
                className="bg-transparent border-none text-lg cursor-pointer px-1 py-0.5 rounded hover:bg-slate-100 transition-colors">
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <ActionBtn icon="ti-dots" label="More" onClick={() => { setDotsOpen((p) => !p); setEmojiOpen(false); }} />
        {dotsOpen && (
          <div className="absolute bottom-[110%] right-0 bg-white border border-slate-200 shadow-lg rounded-lg overflow-hidden z-50 min-w-[130px]">
            {isMine ? (
              <>
                <button onClick={() => { onEdit(); setDotsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-600 bg-transparent border-none cursor-pointer hover:bg-slate-50 transition-colors text-left font-inherit">
                  <i className="ti ti-pencil text-[13px] text-slate-400" /> Edit
                </button>
                <button onClick={() => { onDelete(); setDotsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-red-50 transition-colors text-left font-inherit">
                  <i className="ti ti-trash text-[13px] text-red-400" /> Delete
                </button>
              </>
            ) : (
              <div className="px-3 py-2 text-[11px] text-slate-400">No actions</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, className = "" }) {
  return (
    <button title={label} onClick={onClick}
      className={`w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 text-[14px] cursor-pointer border-none bg-transparent hover:bg-blue-50 transition-colors ${className}`}>
      <i className={`ti ${icon}`} />
    </button>
  );
}