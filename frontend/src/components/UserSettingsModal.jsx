import { useState } from "react";
import Modal from "./Modal";
import { Field, Input, Textarea, Button, ErrorBanner } from "./FormElements";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

const STATUS_OPTIONS = [
  { value: "online", label: "🟢 Online",        color: "#3db87a" },
  { value: "away",   label: "🟡 Away",           color: "#f0a22a" },
  { value: "dnd",    label: "🔴 Do Not Disturb", color: "#e53e3e" },
  { value: "offline",label: "⚫ Invisible",      color: "#6060a0" },
];

export default function UserSettingsModal({ open, onClose }) {
  const { user, updateUser } = useAuth();
  const [tab, setTab]         = useState("profile");
  const [profile, setProfile] = useState({
    displayName:  user?.displayName  || "",
    bio:          user?.bio          || "",
    phone:        user?.phone        || "",
  });
  const [status, setStatus]   = useState(user?.status || "online");
  const [customStatus, setCS] = useState({
    emoji: user?.customStatus?.emoji || "",
    text:  user?.customStatus?.text  || "",
  });
  const [pwForm, setPwForm]   = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 2500); };

  const saveProfile = async () => {
    setError(""); setLoading(true);
    try {
      const { data } = await api.patch("/users/me", {
        displayName: profile.displayName,
        bio:         profile.bio,
        phone:       profile.phone,
      });
      updateUser(data.data);
      flash("Profile saved");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    } finally { setLoading(false); }
  };

  const saveStatus = async () => {
    setError(""); setLoading(true);
    try {
      await api.patch("/users/me/status", { status, customStatus });
      updateUser({ status, customStatus });
      flash("Status updated");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    } finally { setLoading(false); }
  };

  const savePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirm) { setError("Passwords do not match"); return; }
    if (pwForm.newPassword.length < 8)         { setError("Password must be at least 8 characters"); return; }
    setError(""); setLoading(true);
    try {
      await api.patch("/users/me/password", {
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      });
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
      flash("Password changed");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally { setLoading(false); }
  };

  const initials = (user?.displayName || user?.username || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const tabs = ["profile", "status", "password"];

  return (
    <Modal open={open} onClose={onClose} title="Settings" width={520}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "0.5px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(""); setSuccess(""); }}
            style={{
              background: tab === t ? "rgba(93,95,232,0.2)" : "transparent",
              border: tab === t ? "0.5px solid rgba(93,95,232,0.4)" : "0.5px solid transparent",
              borderRadius: 6, padding: "5px 14px",
              fontSize: 12, fontWeight: 500,
              color: tab === t ? "#a0a0f8" : "#6060a0",
              cursor: "pointer", textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} />
      {success && (
        <div style={{ background: "rgba(61,184,122,0.12)", border: "0.5px solid rgba(61,184,122,0.3)", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#6ee7b7", marginBottom: 16 }}>
          ✓ {success}
        </div>
      )}

      {/* ── Profile tab ── */}
      {tab === "profile" && (
        <>
          {/* Avatar preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: user?.avatarColor || "#5d5fe8",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 600, color: "#fff", overflow: "hidden",
              flexShrink: 0,
            }}>
              {user?.avatar
                ? <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#d8d8f0" }}>{user?.displayName || user?.username}</div>
              <div style={{ fontSize: 12, color: "#6060a0" }}>@{user?.username}</div>
            </div>
          </div>

          <Field label="Display Name">
            <Input value={profile.displayName} onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))} placeholder="Your name" maxLength={64} />
          </Field>
          <Field label="Bio">
            <Textarea value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell your team about yourself" rows={2} />
          </Field>
          <Field label="Phone">
            <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 234 567 8900" />
          </Field>

          <Button onClick={saveProfile} disabled={loading} fullWidth>
            {loading ? "Saving…" : "Save Profile"}
          </Button>
        </>
      )}

      {/* ── Status tab ── */}
      {tab === "status" && (
        <>
          <Field label="Availability">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {STATUS_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                    background: status === opt.value ? "rgba(93,95,232,0.15)" : "rgba(255,255,255,0.03)",
                    border: status === opt.value ? "0.5px solid rgba(93,95,232,0.4)" : "0.5px solid rgba(255,255,255,0.06)",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: opt.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: status === opt.value ? "#c8c8f0" : "#8080a8" }}>{opt.label}</span>
                  {status === opt.value && <i className="ti ti-check" style={{ marginLeft: "auto", color: "#5d5fe8" }} />}
                </div>
              ))}
            </div>
          </Field>

          <Field label="Custom Status">
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={customStatus.emoji}
                onChange={(e) => setCS((p) => ({ ...p, emoji: e.target.value }))}
                placeholder="😊"
                style={{ width: 56, background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "9px 12px", fontSize: 18, color: "#e0e0f0", outline: "none", textAlign: "center", boxSizing: "border-box" }}
              />
              <Input value={customStatus.text} onChange={(e) => setCS((p) => ({ ...p, text: e.target.value }))} placeholder="What's your status?" maxLength={100} />
            </div>
          </Field>

          <Button onClick={saveStatus} disabled={loading} fullWidth>
            {loading ? "Saving…" : "Update Status"}
          </Button>
        </>
      )}

      {/* ── Password tab ── */}
      {tab === "password" && (
        <>
          <Field label="Current Password">
            <Input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))} placeholder="••••••••" />
          </Field>
          <Field label="New Password">
            <Input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))} placeholder="Min 8 characters" />
          </Field>
          <Field label="Confirm New Password">
            <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
          </Field>

          <Button onClick={savePassword} disabled={loading} fullWidth>
            {loading ? "Saving…" : "Change Password"}
          </Button>
        </>
      )}
    </Modal>
  );
}