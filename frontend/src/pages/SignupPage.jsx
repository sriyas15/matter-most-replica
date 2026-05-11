import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

export default function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite") || sessionStorage.getItem("pendingInviteToken");

  const [form, setForm] = useState({ username: "", email: "", password: "", displayName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      if (inviteToken) {
        try { await api.post(`/workspaces/join/${inviteToken}`); } catch { }
        sessionStorage.removeItem("pendingInviteToken");
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)" }}>
      <div style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.12)", backdropFilter: "blur(20px)" }}
        className="rounded-2xl p-10 w-full max-w-md shadow-2xl">

        <div className="flex justify-center mb-6">
          <div style={{ background: "linear-gradient(135deg,#5d5fe8,#8b5cf6)" }}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl">M</div>
        </div>

        <h2 className="text-2xl font-semibold text-center mb-1" style={{ color: "#e8e8f8" }}>Create your account</h2>
        <p className="text-center mb-6 text-sm" style={{ color: "#7070a0" }}>
          {inviteToken ? "Create an account to join the workspace" : "Join and start chatting"}
        </p>

        {inviteToken && (
          <div style={{ background: "rgba(93,95,232,0.12)", border: "0.5px solid rgba(93,95,232,0.3)", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#a0a0f0", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-link" /> You'll be added to the workspace automatically after signing up
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm"
            style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "0.5px solid rgba(239,68,68,0.3)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: "displayName", label: "Full Name", type: "text", placeholder: "Jane Doe" },
            { name: "username", label: "Username", type: "text", placeholder: "janedoe" },
            { name: "email", label: "Email", type: "email", placeholder: "jane@company.com" },
            { name: "password", label: "Password", type: "password", placeholder: "Min 8 characters" },
          ].map((f) => (
            <div key={f.name}>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: "#8080a8" }}>{f.label}</label>
              <input type={f.type} name={f.name} placeholder={f.placeholder} value={form[f.name]}
                onChange={handleChange} required
                style={{ background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", color: "#e0e0f0" }}
                className="w-full rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition placeholder-gray-600" />
            </div>
          ))}

          <button type="submit" disabled={loading}
            style={{ background: loading ? "rgba(93,95,232,0.5)" : "#5d5fe8" }}
            className="w-full text-white p-3 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? (
              <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Creating…</>
            ) : inviteToken ? "Create account & join" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "#6060a0" }}>
          Already have an account?{" "}
          <Link to={inviteToken ? `/login?invite=${inviteToken}` : "/login"} className="font-medium" style={{ color: "#8080e8" }}>Sign in</Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}