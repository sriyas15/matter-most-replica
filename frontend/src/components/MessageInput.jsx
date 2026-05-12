import { useState, useRef } from "react";
import { useChat }            from "../context/ChatContext";
import { useTypingIndicator } from "../hooks/useTypingIndicator";

const TOOLBAR_TOOLS = [
  { icon: "ti-bold",          label: "Bold" },
  { icon: "ti-italic",        label: "Italic" },
  { icon: "ti-strikethrough", label: "Strikethrough" },
  null,
  { icon: "ti-code",          label: "Code" },
  { icon: "ti-link",          label: "Link" },
  null,
  { icon: "ti-list-numbers",  label: "Ordered list" },
  { icon: "ti-list",          label: "Unordered list" },
  null,
  { icon: "ti-blockquote",    label: "Quote" },
];

const FOOTER_TOOLS = [
  { icon: "ti-mood-smile", label: "Emoji" },
  { icon: "ti-paperclip",  label: "Attach file" },
  { icon: "ti-gif",        label: "GIF" },
];

export default function MessageInput({ channelName = "general" }) {
  const { sendMessage }       = useChat();
  const { onType, onStop }    = useTypingIndicator();
  const [value, setValue]     = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef           = useRef(null);

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    onStop();
    try {
      await sendMessage(trimmed);
      setValue("");
      textareaRef.current?.focus();
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setValue(e.target.value);
    onType();
  };

  const canSend = value.trim() && !sending;

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
                key={i}
                aria-label={tool.label}
                title={tool.label}
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 text-[13px] border-none bg-transparent cursor-pointer transition-colors"
              >
                <i className={`ti ${tool.icon}`} aria-hidden="true" />
              </button>
            )
          )}
        </div>

        {/* Textarea */}
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

        {/* Footer */}
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <div className="flex gap-0.5">
            {FOOTER_TOOLS.map((tool) => (
              <button
                key={tool.icon}
                aria-label={tool.label}
                title={tool.label}
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 text-[13px] border-none bg-transparent cursor-pointer transition-colors"
              >
                <i className={`ti ${tool.icon}`} aria-hidden="true" />
              </button>
            ))}
          </div>

          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-white border-none cursor-pointer transition-all ${
              canSend
                ? "bg-blue-600 hover:bg-blue-700 opacity-100"
                : "bg-blue-400 opacity-50 cursor-not-allowed"
            }`}
          >
            {sending ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <i className="ti ti-send" aria-hidden="true" />
            )}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}