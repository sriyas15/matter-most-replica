import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import api from "../lib/api";
import Avatar from "./ui/Avatar";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "👀"];

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderText(raw = "") {
  const parts = raw.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="bg-blue-50 px-1 py-0.5 rounded text-[12px] font-mono text-blue-700 border border-blue-100">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function MessageItem({ message, isConsecutive }) {
  const { user } = useAuth();
  const { activeWorkspace, activeChannel } = useWorkspace();
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const [reactions, setReactions] = useState(message.reactions || []);

  const isMine = message.sender?._id === user?._id || message.sender === user?._id;
  const sender = message.sender || {};
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
    try {
      await api.delete(apiBase());
    } catch {}
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

  if (isConsecutive) {
    return (
      <div
        className="flex gap-2.5 py-0.5 hover:bg-slate-50 rounded-md px-1 transition-colors"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="w-8 shrink-0 flex items-center justify-center">
          {hovered && (
            <span className="text-[10px] text-slate-400 leading-none whitespace-nowrap">
              {time}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <EditBox
              value={editText}
              onChange={setEditText}
              onSave={handleEdit}
              onCancel={() => { setEditing(false); setEditText(message.text); }}
            />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-0.5 h-[18px]">
                {hovered && (
                  <>
                    {message.isEdited && (
                      <span className="text-[10px] text-slate-400">(edited)</span>
                    )}
                    <MessageActions
                      isMine={isMine}
                      onEdit={() => setEditing(true)}
                      onDelete={handleDelete}
                      onReact={handleReact}
                    />
                  </>
                )}
              </div>
              <p className="text-[13px] text-slate-700 leading-relaxed break-words">
                {renderText(message.text)}
              </p>
            </>
          )}
          <ReactionRow reactions={reactionMap} onReact={handleReact} userId={user?._id} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex gap-2.5 py-0.5 hover:bg-slate-50 rounded-md px-1 transition-colors relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Avatar user={user} size={32} showStatus />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-slate-800">{name}</span>
          <span className="text-[11px] text-slate-400">{time}</span>
          {message.isEdited && (
            <span className="text-[10px] text-slate-400">(edited)</span>
          )}
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
          <p className="text-[13px] text-slate-700 leading-relaxed break-words">
            {renderText(message.text)}
          </p>
        )}

        <ReactionRow reactions={reactionMap} onReact={handleReact} userId={user?._id} />
      </div>
    </div>
  );
}

function EditBox({ value, onChange, onSave, onCancel }) {
  return (
    <div>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSave(); }
          if (e.key === "Escape") onCancel();
        }}
        className="w-full bg-white border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-md px-2.5 py-1.5 text-[13px] text-slate-800 outline-none resize-none font-inherit box-border transition-all"
        rows={2}
      />
      <div className="flex gap-1.5 mt-1">
        <button
          onClick={onSave}
          className="bg-blue-600 hover:bg-blue-700 text-white border-none rounded px-2.5 py-1 text-[11px] cursor-pointer font-inherit transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="bg-slate-100 hover:bg-slate-200 text-slate-500 border-none rounded px-2.5 py-1 text-[11px] cursor-pointer font-inherit transition-colors"
        >
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
  const [dotsOpen, setDotsOpen] = useState(false);

  return (
    <div className="flex gap-0.5 bg-white border border-slate-200 shadow-sm rounded-md px-1 py-0.5 shrink-0 self-center">

      {/* React */}
      <div className="relative">
        <ActionBtn
          icon="ti-mood-smile"
          label="React"
          onClick={() => { setEmojiOpen((p) => !p); setDotsOpen(false); }}
        />
        {emojiOpen && (
          <div className="absolute bottom-[110%] left-0 bg-white border border-slate-200 shadow-lg rounded-lg p-1.5 flex gap-0.5 z-50">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => { onReact(e); setEmojiOpen(false); }}
                className="bg-transparent border-none text-lg cursor-pointer px-1 py-0.5 rounded hover:bg-slate-100 transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Three dots → edit & delete */}
      <div className="relative">
        <ActionBtn
          icon="ti-dots"
          label="More"
          onClick={() => { setDotsOpen((p) => !p); setEmojiOpen(false); }}
        />
        {dotsOpen && (
          <div className="absolute bottom-[110%] right-0 bg-white border border-slate-200 shadow-lg rounded-lg overflow-hidden z-50 min-w-[130px]">
            {isMine ? (
              <>
                <button
                  onClick={() => { onEdit(); setDotsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-600 bg-transparent border-none cursor-pointer hover:bg-slate-50 transition-colors text-left font-inherit"
                >
                  <i className="ti ti-pencil text-[13px] text-slate-400" />
                  Edit
                </button>
                <button
                  onClick={() => { onDelete(); setDotsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-red-50 transition-colors text-left font-inherit"
                >
                  <i className="ti ti-trash text-[13px] text-red-400" />
                  Delete
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
    <button
      title={label}
      onClick={onClick}
      className={`w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 text-[14px] cursor-pointer border-none bg-transparent hover:bg-blue-50 transition-colors ${className}`}
    >
      <i className={`ti ${icon}`} />
    </button>
  );
}