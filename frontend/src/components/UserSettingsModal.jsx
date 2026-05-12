import { useState } from "react";
import Modal from "./Modal";
import { Field, Input, Textarea, Button, ErrorBanner } from "./FormElements";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

const STATUS_OPTIONS = [
  { value: "online",  label: "🟢 Online",          dot: "bg-emerald-500" },
  { value: "away",    label: "🟡 Away",             dot: "bg-amber-400"   },
  { value: "dnd",     label: "🔴 Do Not Disturb",   dot: "bg-red-500"     },
  { value: "offline", label: "⚫ Invisible",         dot: "bg-slate-400"   },
];

export default function UserSettingsModal({ open, onClose }) {
  const { user, updateUser } = useAuth();
  const [tab, setTab]         = useState("profile");
  const [profile, setProfile] = useState({
    displayName: user?.displayName || "",
    bio:         user?.bio         || "",
    phone:       user?.phone       || "",
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
      <div className="flex gap-1 mb-5 border-b border-slate-100 pb-3">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(""); setSuccess(""); }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium capitalize cursor-pointer border transition-colors
              ${tab === t
                ? "bg-blue-50 border-blue-200 text-blue-600"
                : "bg-transparent border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} />

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-xs text-emerald-700 mb-4">
          ✓ {success}
        </div>
      )}

      {/* ── Profile tab ── */}
      {tab === "profile" && (
        <>
          <div className="flex items-center gap-3.5 mb-5">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-semibold text-white overflow-hidden flex-shrink-0"
              style={{ background: user?.avatarColor || "#2563eb" }}
            >
              {user?.avatar
                ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                : initials}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{user?.displayName || user?.username}</p>
              <p className="text-xs text-slate-400">@{user?.username}</p>
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
            <div className="flex flex-col gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer border transition-colors
                    ${status === opt.value
                      ? "bg-blue-50 border-blue-200"
                      : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                    }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                  <span className={`text-sm ${status === opt.value ? "text-slate-800 font-medium" : "text-slate-500"}`}>
                    {opt.label}
                  </span>
                  {status === opt.value && (
                    <i className="ti ti-check ml-auto text-blue-600" />
                  )}
                </div>
              ))}
            </div>
          </Field>

          <Field label="Custom Status">
            <div className="flex gap-2">
              <input
                value={customStatus.emoji}
                onChange={(e) => setCS((p) => ({ ...p, emoji: e.target.value }))}
                placeholder="😊"
                className="w-14 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-lg text-center outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition box-border"
              />
              <Input
                value={customStatus.text}
                onChange={(e) => setCS((p) => ({ ...p, text: e.target.value }))}
                placeholder="What's your status?"
                maxLength={100}
              />
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