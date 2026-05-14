import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { FaEye,FaEyeSlash } from "react-icons/fa";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite") || sessionStorage.getItem("pendingInviteToken");

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ canSee, setCanSee ] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      if (inviteToken) {
        try { await api.post(`/workspaces/join/${inviteToken}`); } catch { }
        sessionStorage.removeItem("pendingInviteToken");
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100">
      <div className="bg-white border border-slate-200 rounded-2xl p-10 w-full max-w-md shadow-xl">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl select-none">
            M
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-center text-slate-800 mb-1">Welcome back</h2>
        <p className="text-center text-sm text-slate-400 mb-8">
          {inviteToken ? "Sign in to join the workspace" : "Sign in to your workspace"}
        </p>

        {inviteToken && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-700 mb-4">
            <i className="ti ti-link" />
            You'll be added to the workspace automatically after signing in
          </div>
        )}

        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-lg text-sm bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5 font-medium text-black">Email</label>
            <input
              type="email" name="email" placeholder="you@company.com"
              value={form.email} onChange={handleChange} required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none text-black focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5 font-medium text-black">Password</label>
            <div className="relative">
              <input
              type={canSee ? "text" : "password"} name="password" placeholder="••••••••"
              value={form.password} onChange={handleChange} required
              className="relative w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />

            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" 
              onClick={()=>setCanSee(!canSee)}>
              {canSee ? <FaEye className="cursor-pointer" size={16}/>
              : <FaEyeSlash className="cursor-pointer" size={16}/>}
            </button>
            </div>

          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in…
              </>
            ) : inviteToken ? "Sign in & join" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm mt-6 text-slate-400">
          Don't have an account?{" "}
          <Link
            to={inviteToken ? `/signup?invite=${inviteToken}` : "/signup"}
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}