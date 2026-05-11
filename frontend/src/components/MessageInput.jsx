import { useState, useRef } from "react";
import { useChat }              from "../context/ChatContext";
import { useTypingIndicator }   from "../hooks/useTypingIndicator";

const TOOLBAR_TOOLS = [
  { icon: "ti-bold",         label: "Bold" },
  { icon: "ti-italic",       label: "Italic" },
  { icon: "ti-strikethrough",label: "Strikethrough" },
  null,
  { icon: "ti-code",         label: "Code" },
  { icon: "ti-link",         label: "Link" },
  null,
  { icon: "ti-list-numbers", label: "Ordered list" },
  { icon: "ti-list",         label: "Unordered list" },
  null,
  { icon: "ti-blockquote",   label: "Quote" },
];

const FOOTER_TOOLS = [
  { icon: "ti-mood-smile", label: "Emoji" },
  { icon: "ti-paperclip",  label: "Attach file" },
  { icon: "ti-gif",        label: "GIF" },
];

export default function MessageInput({ channelName = "general" }) {
  const { sendMessage }         = useChat();
  const { onType, onStop }      = useTypingIndicator();
  const [value, setValue]       = useState("");
  const [sending, setSending]   = useState(false);
  const textareaRef             = useRef(null);

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
    console.log("[input] calling onType");
    onType();
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.box}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          {TOOLBAR_TOOLS.map((tool, i) =>
            tool === null ? (
              <div key={i} style={styles.sep} />
            ) : (
              <button key={i} style={styles.toolBtn} aria-label={tool.label} title={tool.label}>
                <i className={`ti ${tool.icon}`} aria-hidden="true" />
              </button>
            )
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          style={styles.textarea}
          rows={2}
          placeholder={`Message #${channelName}`}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={onStop}
          aria-label={`Message ${channelName}`}
          disabled={sending}
        />

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerLeft}>
            {FOOTER_TOOLS.map((tool) => (
              <button key={tool.icon} style={styles.toolBtn} aria-label={tool.label} title={tool.label}>
                <i className={`ti ${tool.icon}`} aria-hidden="true" />
              </button>
            ))}
          </div>
          <button
            style={{
              ...styles.sendBtn,
              opacity: value.trim() && !sending ? 1 : 0.45,
              cursor: value.trim() && !sending ? "pointer" : "default",
            }}
            onClick={handleSend}
            disabled={!value.trim() || sending}
            aria-label="Send message"
          >
            {sending ? (
              <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
            ) : (
              <i className="ti ti-send" aria-hidden="true" />
            )}
            Send
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles = {
  wrapper: { padding: "10px 14px 14px", borderTop: "0.5px solid rgba(255,255,255,0.07)", background: "#25253a", flexShrink: 0 },
  box: { background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 8, overflow: "hidden" },
  toolbar: { display: "flex", alignItems: "center", gap: 2, padding: "6px 8px", borderBottom: "0.5px solid rgba(255,255,255,0.06)", flexWrap: "wrap" },
  toolBtn: { width: 26, height: 26, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#6060a0", fontSize: 14, cursor: "pointer", border: "none", background: "transparent", transition: "background 0.15s, color 0.15s" },
  sep: { width: 0.5, height: 16, background: "rgba(255,255,255,0.1)", margin: "0 4px" },
  textarea: { padding: "8px 12px", fontSize: 13, color: "#c0c0e0", outline: "none", background: "transparent", border: "none", width: "100%", resize: "none", fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.5 },
  footer: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 6px" },
  footerLeft: { display: "flex", gap: 2 },
  sendBtn: { background: "#5d5fe8", border: "none", borderRadius: 5, padding: "5px 12px", fontSize: 12, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", fontWeight: 500, transition: "background 0.15s" },
};