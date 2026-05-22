import { useState, useRef, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
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

const ACCEPT_ATTR = ["image/*","video/*","audio/*",".pdf",".doc",".docx",".txt"].join(",");

// ─── Emoji data ───────────────────────────────────────────────────────────────

const EMOJI_CATEGORIES = [
  { label: "Smileys",  emojis: ["😀","😂","😍","😎","🥳","😭","😅","🤔","😴","🤯","😡","🥺","😇","🤩","😏","😬","😱","🤗","😑","🙄"] },
  { label: "Gestures", emojis: ["👍","👎","👌","✌️","🤞","👏","🙌","🤝","👋","🤙","💪","🙏","☝️","👉","👈","🤘","🖐️","✋","👊","🤜"] },
  { label: "Objects",  emojis: ["🔥","💡","🎉","🎊","💯","⭐","✨","💥","❤️","💔","💬","📎","📌","🔗","🔒","🔑","📝","💻","📱","🎵"] },
  { label: "Nature",   emojis: ["🌟","🌈","☀️","🌙","⚡","🌊","🌸","🌺","🍀","🦋","🐶","🐱","🦊","🐻","🦁","🐸","🌵","🍕","🍔","🎂"] },
];

// ─── Toolbar config ───────────────────────────────────────────────────────────

const TOOLBAR_TOOLS = [
  { icon: "ti-bold",          label: "Bold",           command: "bold"               },
  { icon: "ti-italic",        label: "Italic",         command: "italic"             },
  { icon: "ti-strikethrough", label: "Strikethrough",  command: "strikeThrough"      },
  null,
  { icon: "ti-code",          label: "Inline code",    command: "insertCode"         },
  { icon: "ti-link",          label: "Link",           command: "insertLink"         },
  null,
  { icon: "ti-list-numbers",  label: "Ordered list",   command: "insertOrderedList"  },
  { icon: "ti-list",          label: "Unordered list", command: "insertUnorderedList" },
  null,
  { icon: "ti-blockquote",    label: "Quote",          command: "formatBlock", value: "blockquote" },
];

// ─── File helpers ─────────────────────────────────────────────────────────────

const getFileCategory = (type) => {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "doc";
};

const FILE_ACCENT     = { image: "border-sky-400/40 bg-sky-50", video: "border-violet-400/40 bg-violet-50", audio: "border-emerald-400/40 bg-emerald-50", doc: "border-amber-400/40 bg-amber-50" };
const FILE_ICON_COLOR = { image: "text-sky-500", video: "text-violet-500", audio: "text-emerald-500", doc: "text-amber-500" };
const FILE_ICON_CLASS = { image: "ti-photo", video: "ti-video", audio: "ti-music", doc: "ti-file-text" };
const formatSize = (b) => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`;

// ─── execCommand formatting ───────────────────────────────────────────────────

function execFormat(command, value = null) {
  if (command === "insertCode") {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const selected = sel.toString();
    const codeParent = sel.anchorNode?.parentElement?.closest("code");
    if (codeParent) {
      codeParent.replaceWith(document.createTextNode(codeParent.textContent));
    } else {
      const html = selected
        ? `<code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-family:monospace;font-size:12px">${selected}</code>`
        : `<code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-family:monospace;font-size:12px">&#8203;</code>`;
      document.execCommand("insertHTML", false, html);
    }
    return;
  }

  if (command === "insertLink") {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const selected = sel.toString();
    const url = window.prompt("Enter URL:", "https://");
    if (!url) return;
    document.execCommand(
      "insertHTML", false,
      `<a href="${url}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:underline">${selected || url}</a>`
    );
    return;
  }

  value ? document.execCommand(command, false, value) : document.execCommand(command, false, null);
}

// ─── EmojiPicker (portal — escapes overflow-hidden) ──────────────────────────

function EmojiPicker({ anchorRef, onSelect, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.top - 8, left: rect.left });
    }

    const handler = (e) => {
      if (
        ref.current && !ref.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  return ReactDOM.createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translateY(-100%)", zIndex: 9999 }}
      className="w-[300px] bg-white border border-slate-200 rounded-xl shadow-xl"
    >
      <div className="max-h-[260px] overflow-y-auto overflow-x-hidden p-2 rounded-xl" style={{ scrollbarWidth: "thin" }}>
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.label} className="mb-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-1 mb-1">{cat.label}</p>
            <div className="flex flex-wrap gap-0.5">
              {cat.emojis.map((e) => (
                <button key={e} onClick={() => onSelect(e)}
                  className="w-8 h-8 flex items-center justify-center text-[18px] rounded-md hover:bg-slate-100 border-none bg-transparent cursor-pointer transition-colors">
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}

// ─── FilePreviewStrip ─────────────────────────────────────────────────────────

function FilePreviewStrip({ file, onRemove, uploading }) {
  const cat = file.category;
  return (
    <div className={`mx-0 mb-1 flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${FILE_ACCENT[cat]}`}>
      <div className="w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
        {cat === "image" ? <img src={file.previewUrl} alt="" className="w-full h-full object-cover" />
          : cat === "video" ? <video src={file.previewUrl} className="w-full h-full object-cover" muted />
          : <i className={`ti ${FILE_ICON_CLASS[cat]} text-lg ${FILE_ICON_COLOR[cat]}`} />}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[12px] font-medium text-slate-700 truncate">{file.name}</span>
        <span className="text-[11px] text-slate-400">{formatSize(file.size)}</span>
      </div>
      {uploading
        ? <span className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin flex-shrink-0" />
        : <button onClick={onRemove} className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 border-none bg-transparent cursor-pointer transition-colors flex-shrink-0">
            <i className="ti ti-x text-[11px]" />
          </button>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MessageInput({ channelName = "general" }) {
  const { sendMessage }     = useChat();
  const { activeWorkspace } = useWorkspace();
  const { onType, onStop }  = useTypingIndicator();

  const [sending, setSending]         = useState(false);
  const [showEmoji, setShowEmoji]     = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [isEmpty, setIsEmpty]         = useState(true);

  const editorRef      = useRef(null);
  const fileInputRef   = useRef(null);
  const emojiButtonRef = useRef(null);

  useEffect(() => {
    return () => { if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl); };
  }, [pendingFile]);

  const getEditorText = () => editorRef.current?.innerText?.trim() ?? "";
  const getEditorHTML = () => editorRef.current?.innerHTML ?? "";

  const handleEditorInput = () => {
    setIsEmpty(getEditorText().length === 0);
    onType();
  };

  const handleToolbarClick = useCallback((tool) => {
    execFormat(tool.command, tool.value);
    editorRef.current?.focus();
  }, []);

  const handleEmojiSelect = useCallback((emoji) => {
    editorRef.current?.focus();
    document.execCommand("insertText", false, emoji);
    setShowEmoji(false);
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > MAX_FILE_SIZE_BYTES) { alert(`File exceeds the ${MAX_FILE_SIZE_MB} MB limit.`); return; }
    if (!ACCEPTED_TYPES.includes(file.type)) { alert("Unsupported file type."); return; }
    const previewUrl = URL.createObjectURL(file);
    setPendingFile({ file, name: file.name, size: file.size, type: file.type, category: getFileCategory(file.type), previewUrl });
  }, []);

  const clearFile = useCallback(() => {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [pendingFile]);

  const handleSend = useCallback(async () => {
    const text = getEditorText();
    if ((!text && !pendingFile) || sending || uploading) return;
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
            `/workspaces/${activeWorkspace._id}/files`, form,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          uploadedFileId = data.data._id;
        } catch {
          alert("File upload failed. Please try again.");
          return;
        } finally {
          setUploading(false);
        }
      }
      await sendMessage(getEditorHTML(), uploadedFileId ? [uploadedFileId] : []);
      if (editorRef.current) editorRef.current.innerHTML = "";
      setIsEmpty(true);
      clearFile();
      editorRef.current?.focus();
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  }, [pendingFile, sending, uploading, activeWorkspace?._id, onStop, sendMessage, clearFile]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const sel = window.getSelection();
      const node = sel?.anchorNode;
      const insideList = !!(node && (
        node.parentElement?.closest("li") ||
        node.parentElement?.closest("ol") ||
        node.parentElement?.closest("ul")
      ));
      if (insideList) {
        requestAnimationFrame(() => {
          const ed = editorRef.current;
          if (ed) ed.scrollTop = ed.scrollHeight;
        });
        return;
      }
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const canSend = (!isEmpty || pendingFile) && !sending && !uploading;

  return (
    <div className="px-3.5 pb-3.5 pt-2.5 border-t border-slate-200 bg-white flex-shrink-0">
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">

        {/* Toolbar */}
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
                onMouseDown={(e) => { e.preventDefault(); handleToolbarClick(tool); }}
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 text-[13px] border-none bg-transparent cursor-pointer transition-colors"
              >
                <i className={`ti ${tool.icon}`} aria-hidden="true" />
              </button>
            )
          )}
        </div>

        {/* File preview */}
        {pendingFile && (
          <div className="px-2 pt-2">
            <FilePreviewStrip file={pendingFile} onRemove={clearFile} uploading={uploading} />
          </div>
        )}

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable={!sending}
          suppressContentEditableWarning
          onInput={handleEditorInput}
          onKeyDown={handleKeyDown}
          onBlur={onStop}
          aria-label={`Message ${channelName}`}
          aria-multiline="true"
          role="textbox"
          data-placeholder={`Message #${channelName}`}
          className="w-full px-3 py-2 text-[13px] text-slate-800 outline-none bg-transparent min-h-[48px] max-h-[200px] overflow-y-auto leading-relaxed empty-placeholder"
          style={{ wordBreak: "break-word" }}
        />

        {/* Footer */}
        <div className="flex items-center justify-between px-2 pb-2 pt-0">
          <div className="flex gap-0.5 relative">

            {/* Emoji */}
            <div className="relative">
              <button
                ref={emojiButtonRef}
                type="button"
                aria-label="Emoji"
                title="Emoji"
                onClick={() => setShowEmoji((p) => !p)}
                className={`w-6 h-6 rounded flex items-center justify-center text-[13px] border-none bg-transparent cursor-pointer transition-colors ${
                  showEmoji ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                }`}
              >
                <i className="ti ti-mood-smile" />
              </button>
              {showEmoji && (
                <EmojiPicker
                  anchorRef={emojiButtonRef}
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmoji(false)}
                />
              )}
            </div>

            {/* Attach */}
            <button
              type="button"
              aria-label="Attach file"
              title={`Attach file · max ${MAX_FILE_SIZE_MB} MB`}
              onClick={() => fileInputRef.current?.click()}
              disabled={!!pendingFile}
              className={`w-6 h-6 rounded flex items-center justify-center text-[13px] border-none bg-transparent cursor-pointer transition-colors ${
                pendingFile ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              <i className="ti ti-paperclip" />
            </button>
            <input ref={fileInputRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={handleFileChange} />

          </div>

          {/* Send */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-white border-none cursor-pointer transition-all ${
              canSend ? "bg-blue-600 hover:bg-blue-700 opacity-100" : "bg-blue-400 opacity-50 cursor-not-allowed"
            }`}
          >
            {sending || uploading
              ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <i className="ti ti-send" />}
            {uploading ? "Uploading..." : "Send"}
          </button>
        </div>
      </div>

      <style>{`
        .empty-placeholder:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }
        .empty-placeholder strong { font-weight: 600; }
        .empty-placeholder em { font-style: italic; }
        .empty-placeholder ul { list-style: disc; padding-left: 1.25rem; }
        .empty-placeholder ol { list-style: decimal; padding-left: 1.25rem; }
        .empty-placeholder blockquote {
          border-left: 3px solid #cbd5e1;
          padding-left: 0.75rem;
          color: #64748b;
          margin: 2px 0;
        }
        .empty-placeholder a { color: #2563eb; text-decoration: underline; }
      `}</style>
    </div>
  );
}