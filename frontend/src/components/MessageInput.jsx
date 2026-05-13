import { useState, useRef, useCallback, useEffect } from "react";
import { useChat }            from "../context/ChatContext";
import { useTypingIndicator } from "../hooks/useTypingIndicator";
import { useWorkspace }       from "../context/WorkspaceContext";
import api                    from "../lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_MB    = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ACCEPTED_TYPES = [
  "image/png","image/jpg","image/jpeg","image/gif","image/webp",
  "video/mp4","video/webm","video/ogg",
  "audio/mpeg","audio/wav","audio/ogg",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
];

const ACCEPT_ATTR = [
  "image/*", "video/*", "audio/*",
  ".pdf", ".doc", ".docx", ".txt",
].join(",");

// ─── Emoji data ───────────────────────────────────────────────────────────────

const EMOJI_CATEGORIES = [
  {
    label: "Smileys",
    emojis: ["😀","😂","😍","😎","🥳","😭","😅","🤔","😴","🤯","😡","🥺","😇","🤩","😏","😬","😱","🤗","😑","🙄"],
  },
  {
    label: "Gestures",
    emojis: ["👍","👎","👌","✌️","🤞","👏","🙌","🤝","👋","🤙","💪","🙏","☝️","👉","👈","🤘","🖐️","✋","👊","🤜"],
  },
  {
    label: "Objects",
    emojis: ["🔥","💡","🎉","🎊","💯","⭐","✨","💥","❤️","💔","💬","📎","📌","🔗","🔒","🔑","📝","💻","📱","🎵"],
  },
  {
    label: "Nature",
    emojis: ["🌟","🌈","☀️","🌙","⚡","🌊","🌸","🌺","🍀","🦋","🐶","🐱","🦊","🐻","🦁","🐸","🌵","🍕","🍔","🎂"],
  },
];

// ─── Toolbar config ───────────────────────────────────────────────────────────

const TOOLBAR_TOOLS = [
  { icon: "ti-bold",          label: "Bold",           wrap: ["**","**"]  },
  { icon: "ti-italic",        label: "Italic",         wrap: ["_","_"]    },
  { icon: "ti-strikethrough", label: "Strikethrough",  wrap: ["~~","~~"]  },
  null,
  { icon: "ti-code",          label: "Inline code",    wrap: ["`","`"]    },
  { icon: "ti-link",          label: "Link",           wrap: ["[","](url)"] },
  null,
  { icon: "ti-list-numbers",  label: "Ordered list",   prefix: "1. "     },
  { icon: "ti-list",          label: "Unordered list", prefix: "- "      },
  null,
  { icon: "ti-blockquote",    label: "Quote",          prefix: "> "      },
];

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

const FILE_ICON_COLOR = {
  image: "text-sky-500",
  video: "text-violet-500",
  audio: "text-emerald-500",
  doc:   "text-amber-500",
};

const FILE_ICON_CLASS = {
  image: "ti-photo",
  video: "ti-video",
  audio: "ti-music",
  doc:   "ti-file-text",
};

const formatSize = (bytes) =>
  bytes > 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;

// ─── Formatting helpers ───────────────────────────────────────────────────────

const applyFormat = (textarea, tool) => {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end);

  if (tool.wrap) {
    const [open, close] = tool.wrap;
    const hasSelection = start !== end;

    // Toggle off: if the selection is already wrapped, unwrap it
    const before = value.slice(start - open.length, start);
    const after  = value.slice(end, end + close.length);
    if (before === open && after === close) {
      const next = value.slice(0, start - open.length) + selected + value.slice(end + close.length);
      return { value: next, selStart: start - open.length, selEnd: end - open.length };
    }

    const next = value.slice(0, start) + open + selected + close + value.slice(end);

    if (hasSelection) {
      // Keep the wrapped text selected so the user sees what changed
      return { value: next, selStart: start + open.length, selEnd: end + open.length };
    } else {
      // No selection: place cursor between the markers so the user can type
      const cursorPos = start + open.length;
      return { value: next, selStart: cursorPos, selEnd: cursorPos };
    }
  }

  if (tool.prefix) {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd   = value.indexOf("\n", end);
    const block     = value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    const lines     = block.split("\n");

    const allPrefixed = lines.every((l) => l.startsWith(tool.prefix));
    const newBlock = allPrefixed
      ? lines.map((l) => l.slice(tool.prefix.length)).join("\n")
      : lines.map((l) => (l.startsWith(tool.prefix) ? l : tool.prefix + l)).join("\n");

    const next = value.slice(0, lineStart) + newBlock + (lineEnd === -1 ? "" : value.slice(lineEnd));
    const delta = newBlock.length - block.length;
    return { value: next, selStart: start + delta, selEnd: end + delta };
  }

  return { value, selStart: start, selEnd: end };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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
      className="absolute bottom-full left-0 mb-1 w-[300px] bg-white border border-slate-200 rounded-xl shadow-xl z-50"
    >
      <div className="max-h-[260px] overflow-y-auto overflow-x-hidden p-2 rounded-xl" style={{ scrollbarWidth: "thin" }}>
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
                  className="w-8 h-8 flex items-center justify-center text-[18px] rounded-md hover:bg-slate-100 border-none bg-transparent cursor-pointer transition-colors"
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

function FilePreviewStrip({ file, onRemove, uploading }) {
  const cat = file.category;
  return (
    <div className={`mx-0 mb-1 flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${FILE_ACCENT[cat]}`}>
      <div className="w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
        {cat === "image" ? (
          <img src={file.previewUrl} alt="" className="w-full h-full object-cover" />
        ) : cat === "video" ? (
          <video src={file.previewUrl} className="w-full h-full object-cover" muted />
        ) : (
          <i className={`ti ${FILE_ICON_CLASS[cat]} text-lg ${FILE_ICON_COLOR[cat]}`} />
        )}
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[12px] font-medium text-slate-700 truncate">{file.name}</span>
        <span className="text-[11px] text-slate-400">{formatSize(file.size)}</span>
      </div>

      {uploading ? (
        <span className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin flex-shrink-0" />
      ) : (
        <button
          onClick={onRemove}
          className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 border-none bg-transparent cursor-pointer transition-colors flex-shrink-0"
        >
          <i className="ti ti-x text-[11px]" />
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MessageInput({ channelName = "general" }) {
  const { sendMessage }     = useChat();
  const { activeWorkspace } = useWorkspace();
  const { onType, onStop }  = useTypingIndicator();

  const [value, setValue]         = useState("");
  const [sending, setSending]     = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);

  // pendingFile holds the raw File object + display meta — no upload yet
  const [pendingFile, setPendingFile] = useState(null);
  // { file: File, name, size, type, category, previewUrl }

  const textareaRef  = useRef(null);
  const fileInputRef = useRef(null);

  // ── Cleanup blob URL ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    };
  }, [pendingFile]);

  // ── Toolbar ─────────────────────────────────────────────────────────────────
  const handleToolbarClick = useCallback((tool) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { value: next, selStart, selEnd } = applyFormat(ta, tool);
    setValue(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  }, []);

  // ── Emoji ───────────────────────────────────────────────────────────────────
  const handleEmojiSelect = useCallback((emoji) => {
    const ta = textareaRef.current;
    if (!ta) { setValue((v) => v + emoji); setShowEmoji(false); return; }
    const { selectionStart: start, selectionEnd: end, value: v } = ta;
    const next = v.slice(0, start) + emoji + v.slice(end);
    setValue(next);
    setShowEmoji(false);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }, []);

  // ── File selection — just stage it, no upload ───────────────────────────────
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(`File exceeds the ${MAX_FILE_SIZE_MB} MB limit.`);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert("Unsupported file type.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingFile({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      category: getFileCategory(file.type),
      previewUrl,
    });
  }, []);

  const clearFile = useCallback(() => {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [pendingFile]);

  // ── Send — upload happens here, only when user confirms ────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = value.trim();
    if ((!trimmed && !pendingFile) || sending || uploading) return;

    setSending(true);
    onStop();

    try {
      let uploadedFileId = null;

      if (pendingFile) {
        setUploading(true);
        try {
          const form = new FormData();
          form.append("file", pendingFile.file);
          const { data } = await api.post(
            `/workspaces/${activeWorkspace._id}/files`,
            form,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          uploadedFileId = data.data._id;
        } catch (err) {
          console.error("File upload failed:", err);
          alert("File upload failed. Please try again.");
          return; // abort — don't send the message
        } finally {
          setUploading(false);
        }
      }

      await sendMessage(trimmed, uploadedFileId ? [uploadedFileId] : []);
      setValue("");
      clearFile();
      textareaRef.current?.focus();
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  }, [value, pendingFile, sending, uploading, activeWorkspace?._id, onStop, sendMessage, clearFile]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleChange = (e) => {
    setValue(e.target.value);
    onType();
  };

  const canSend = (value.trim() || pendingFile) && !sending && !uploading;

  return (
    <div className="px-3.5 pb-3.5 pt-2.5 border-t border-slate-200 bg-white flex-shrink-0">
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 flex-wrap">
          {TOOLBAR_TOOLS.map((tool, i) =>
            tool === null ? (
              <div key={i} className="w-px h-4 bg-slate-200 mx-1" />
            ) : (
              <button
                key={tool.label}
                type="button"
                aria-label={tool.label}
                title={tool.label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleToolbarClick(tool);
                }}
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 text-[13px] border-none bg-transparent cursor-pointer transition-colors"
              >
                <i className={`ti ${tool.icon}`} aria-hidden="true" />
              </button>
            )
          )}
        </div>

        {/* ── File preview ── */}
        {pendingFile && (
          <div className="px-2 pt-2">
            <FilePreviewStrip
              file={pendingFile}
              onRemove={clearFile}
              uploading={uploading}
            />
          </div>
        )}

        {/* ── Textarea ── */}
        <textarea
          ref={textareaRef}
          rows={2}
          placeholder={`Message #${channelName}`}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={onStop}
          aria-label={`Message ${channelName}`}
          disabled={sending}
          className="w-full px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none bg-transparent border-none resize-none font-inherit box-border leading-relaxed"
        />

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-2 pb-2 pt-0">
          <div className="flex gap-0.5 relative">

            {/* Emoji */}
            <div className="relative">
              <button
                type="button"
                aria-label="Emoji"
                title="Emoji"
                onClick={() => setShowEmoji((p) => !p)}
                className={`w-6 h-6 rounded flex items-center justify-center text-[13px] border-none bg-transparent cursor-pointer transition-colors ${
                  showEmoji ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                }`}
              >
                <i className="ti ti-mood-smile" aria-hidden="true" />
              </button>
              {showEmoji && (
                <EmojiPicker
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmoji(false)}
                />
              )}
            </div>

            {/* Attach file */}
            <button
              type="button"
              aria-label="Attach file"
              title={`Attach file · max ${MAX_FILE_SIZE_MB} MB`}
              onClick={() => fileInputRef.current?.click()}
              disabled={!!pendingFile}
              className={`w-6 h-6 rounded flex items-center justify-center text-[13px] border-none bg-transparent cursor-pointer transition-colors ${
                pendingFile
                  ? "text-blue-600 bg-blue-50"
                  : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              <i className="ti ti-paperclip" aria-hidden="true" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={handleFileChange}
            />

            {/* GIF placeholder */}
            <button
              type="button"
              aria-label="GIF"
              title="GIF (coming soon)"
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 text-[13px] border-none bg-transparent cursor-pointer transition-colors"
            >
              <i className="ti ti-gif" aria-hidden="true" />
            </button>
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-white border-none cursor-pointer transition-all ${
              canSend
                ? "bg-blue-600 hover:bg-blue-700 opacity-100"
                : "bg-blue-400 opacity-50 cursor-not-allowed"
            }`}
          >
            {sending || uploading ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <i className="ti ti-send" aria-hidden="true" />
            )}
            {uploading ? "Uploading..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}