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
        <code
          key={i}
          className="bg-white/8 px-[5px] py-[1px] rounded-[3px] font-mono text-[12px] text-[#c0c0e0]"
        >
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
        className="flex gap-[10px] py-[2px]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="w-8 shrink-0 flex items-center justify-center">
          {hovered && (
            <span className="text-[10px] text-[#8080a8] leading-none whitespace-nowrap">
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
              <div className="flex items-baseline gap-2 mb-[3px] h-[18px]">
                {hovered && (
                  <>
                    {message.isEdited && (
                      <span className="text-[10px] text-[#8080a8]">(edited)</span>
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
              <p className="text-[13px] text-[#a0a0c0] leading-relaxed break-words">
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
      className="flex gap-[10px] py-[2px] relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Avatar user={sender} size={32} showStatus />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-[3px]">
          <span className="text-[13px] font-medium text-[#d8d8f0]">{name}</span>
          <span className="text-[11px] text-[#8080a8]">{time}</span>
          {message.isEdited && (
            <span className="text-[10px] text-[#8080a8]">(edited)</span>
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
          <p className="text-[13px] text-[#a0a0c0] leading-relaxed break-words">
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
        className="w-full bg-white/7 border border-[rgba(93,95,232,0.5)] rounded-[6px] px-[10px] py-[6px] text-[13px] text-[#d0d0f0] outline-none resize-none font-inherit box-border"
        rows={2}
      />
      <div className="flex gap-[6px] mt-1">
        <button onClick={onSave} className="bg-[#5d5fe8] text-white border-none rounded px-[10px] py-[3px] text-[11px] cursor-pointer font-inherit">
          Save
        </button>
        <button onClick={onCancel} className="bg-white/8 text-[#a0a0c0] border-none rounded px-[10px] py-[3px] text-[11px] cursor-pointer font-inherit">
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
            className={`flex items-center gap-[3px] rounded-[10px] px-[7px] py-[2px] text-[13px] cursor-pointer text-[#c0c0d8] border transition-colors ${
              mine
                ? "bg-[rgba(93,95,232,0.25)] border-[rgba(93,95,232,0.5)]"
                : "bg-white/7 border-white/10"
            }`}
          >
            {r.emoji}
            <span className="text-[11px]">{r.count}</span>
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
    <div className="flex gap-[2px] bg-[#2a2a3e] border border-white/10 rounded-[6px] px-[4px] py-[2px] shrink-0 self-center">

      {/* React */}
      <div className="relative">
        <ActionBtn
          icon="ti-mood-smile"
          label="React"
          onClick={() => { setEmojiOpen((p) => !p); setDotsOpen(false); }}
        />
        {emojiOpen && (
          <div className="absolute bottom-[110%] left-0 bg-[#2a2a3e] border border-white/12 rounded-[8px] p-[6px_8px] flex gap-[2px] z-50 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => { onReact(e); setEmojiOpen(false); }}
                className="bg-none border-none text-[18px] cursor-pointer p-[2px_3px] rounded"
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
          <div
            className="absolute bottom-[110%] right-0 bg-[#2a2a3e] border border-white/12 rounded-[8px] overflow-hidden z-50 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            style={{ minWidth: 130 }}
          >
            {isMine ? (
              <>
                <button
                  onClick={() => { onEdit(); setDotsOpen(false); }}
                  className="w-full flex items-center gap-[8px] px-[12px] py-[8px] text-[12px] text-[#c0c0d8] bg-transparent border-none cursor-pointer hover:bg-white/6 transition-colors text-left font-inherit"
                >
                  <i className="ti ti-pencil text-[13px] text-[#7070a0]" />
                  Edit
                </button>
                <button
                  onClick={() => { onDelete(); setDotsOpen(false); }}
                  className="w-full flex items-center gap-[8px] px-[12px] py-[8px] text-[12px] text-[#f87171] bg-transparent border-none cursor-pointer hover:bg-white/6 transition-colors text-left font-inherit"
                >
                  <i className="ti ti-trash text-[13px] text-[#f87171]" />
                  Delete
                </button>
              </>
            ) : (
              <div className="px-[12px] py-[8px] text-[11px] text-[#5050a0]">No actions</div>
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
      className={`w-[26px] h-[26px] rounded flex items-center justify-center text-[#7070a0] text-[14px] cursor-pointer border-none bg-white/5 hover:bg-white/10 transition-colors ${className}`}
    >
      <i className={`ti ${icon}`} />
    </button>
  );
}