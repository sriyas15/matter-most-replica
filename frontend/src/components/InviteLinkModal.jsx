import { useState, useEffect } from "react";
import api from "../lib/api";

// ── InviteLinkModal ────────────────────────────────────────────────────────────
// Shown from the workspace dropdown → "Invite People"
// Generates / regenerates an invite link and lets the user copy it.
export default function InviteLinkModal({ workspace, onClose }) {
  const [inviteUrl, setInviteUrl]   = useState("");
  const [expiresAt, setExpiresAt]   = useState(null);
  const [loading, setLoading]       = useState(false);
  const [copied, setCopied]         = useState(false);
  const [error, setError]           = useState("");

  // Auto-generate on open
  useEffect(() => {
    generateLink();
  }, []);

  const generateLink = async () => {
    setLoading(true);
    setError("");
    setCopied(false);
    try {
      const { data } = await api.post(`/workspaces/${workspace._id}/invite-link`);
      setInviteUrl(data.inviteUrl);
      setExpiresAt(data.expiresAt);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate invite link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for non-https / older browsers
      const el = document.createElement("textarea");
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-base"
              style={{ background: workspace?.themeColor || "#2563eb" }}
            >
              <i className="ti ti-link" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-slate-800">Invite to {workspace?.name}</div>
              <div className="text-[11px] text-slate-400">Share a link to add people</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg p-1 rounded-md hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-xs mb-4">
            {error}
          </div>
        )}

        {/* Link box */}
        <div className="mb-3">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Invite Link
          </label>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
            {loading ? (
              <div className="flex items-center gap-2 flex-1">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin inline-block flex-shrink-0" />
                <span className="text-[12px] text-slate-400">Generating link…</span>
              </div>
            ) : (
              <span className="text-[12px] text-slate-600 flex-1 truncate font-mono select-all">
                {inviteUrl || "—"}
              </span>
            )}
            <button
              onClick={handleCopy}
              disabled={!inviteUrl || loading}
              title="Copy link"
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border-none cursor-pointer transition-all ${
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              <i className={`ti ${copied ? "ti-check" : "ti-copy"} text-[13px]`} />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {expiryLabel && !loading && (
            <div className="flex items-center gap-1.5 mt-2">
              <i className="ti ti-clock text-[11px] text-slate-400" />
              <span className="text-[11px] text-slate-400">
                Link expires <strong className="text-slate-500">{expiryLabel}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 mb-5">
          <div className="flex gap-2 items-start">
            <i className="ti ti-info-circle text-[13px] text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-blue-700 leading-relaxed m-0">
              Anyone with this link can join <strong>{workspace?.name}</strong> as a member.
              Regenerating creates a new link and invalidates the old one.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium border-none cursor-pointer"
          >
            Done
          </button>
          <button
            onClick={generateLink}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <i className="ti ti-refresh text-[13px]" />
            {loading ? "Generating…" : "Regenerate Link"}
          </button>
        </div>
      </div>
    </div>
  );
}