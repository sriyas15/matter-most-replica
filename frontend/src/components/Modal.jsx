import { useEffect } from "react";

export default function Modal({ open, onClose, title, children, width = 480 }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ ...styles.modal, width }}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>{title}</span>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>{children}</div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    background: "#1e1e30",
    border: "0.5px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
    overflow: "hidden",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "0.5px solid rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    color: "#e0e0f0",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#6060a0",
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: "20px",
    overflowY: "auto",
    flex: 1,
  },
};