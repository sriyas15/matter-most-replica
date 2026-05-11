export function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#8080a8", marginBottom: 6 }}>
          {label}
        </label>
      )}
      {children}
      {error && (
        <p style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{error}</p>
      )}
    </div>
  );
}

export function Input({ value, onChange, placeholder, type = "text", disabled, autoFocus, maxLength }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      maxLength={maxLength}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.06)",
        border: "0.5px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        padding: "9px 12px",
        fontSize: 13,
        color: "#e0e0f0",
        outline: "none",
        boxSizing: "border-box",
        fontFamily: "inherit",
        transition: "border-color 0.15s",
      }}
      onFocus={(e) => (e.target.style.borderColor = "rgba(93,95,232,0.6)")}
      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
    />
  );
}

export function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.06)",
        border: "0.5px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        padding: "9px 12px",
        fontSize: 13,
        color: "#e0e0f0",
        outline: "none",
        boxSizing: "border-box",
        fontFamily: "inherit",
        resize: "vertical",
        lineHeight: 1.5,
      }}
      onFocus={(e) => (e.target.style.borderColor = "rgba(93,95,232,0.6)")}
      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
    />
  );
}

export function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: "100%",
        background: "#2a2a3e",
        border: "0.5px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        padding: "9px 12px",
        fontSize: 13,
        color: "#e0e0f0",
        outline: "none",
        boxSizing: "border-box",
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      {children}
    </select>
  );
}

export function Button({ children, onClick, disabled, variant = "primary", type = "button", fullWidth }) {
  const base = {
    border: "none",
    borderRadius: 8,
    padding: "9px 18px",
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "opacity 0.15s",
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? "100%" : undefined,
  };

  const variants = {
    primary:   { background: "#5d5fe8", color: "#fff" },
    secondary: { background: "rgba(255,255,255,0.08)", color: "#c0c0d8" },
    danger:    { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "0.5px solid rgba(239,68,68,0.3)" },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant] }}
    >
      {children}
    </button>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{
      background: "rgba(239,68,68,0.12)",
      border: "0.5px solid rgba(239,68,68,0.3)",
      borderRadius: 8,
      padding: "9px 12px",
      fontSize: 12,
      color: "#f87171",
      marginBottom: 16,
    }}>
      {message}
    </div>
  );
}