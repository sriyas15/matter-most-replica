import { useState } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import api from "../lib/api";

export default function CreateChannelModal({ onClose }) {
  const { activeWorkspace, addChannel } = useWorkspace();
  const [form, setForm]     = useState({ name: "", description: "", type: "public" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post(`/workspaces/${activeWorkspace._id}/channels`, {
        name:        form.name.toLowerCase().replace(/\s+/g, "-"),
        displayName: form.name,
        description: form.description,
        type:        form.type,
      });
      addChannel(data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create channel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-[440px] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-semibold text-slate-800 m-0">Create a Channel</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-lg p-1 rounded-md border-none bg-transparent cursor-pointer transition-colors flex items-center">
            <i className="ti ti-x" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-[12px] mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Channel type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-500">Channel Type</label>
            <div className="flex gap-2">
              {["public", "private"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, type: t }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[13px] border cursor-pointer transition-colors font-inherit ${
                    form.type === t
                      ? "bg-blue-50 border-blue-400 text-blue-700 font-medium"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600"
                  }`}
                >
                  <i className={`ti ${t === "public" ? "ti-hash" : "ti-lock"} text-[13px]`} />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-500">Channel Name</label>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-slate-400 text-[14px] pointer-events-none">
                <i className={`ti ${form.type === "private" ? "ti-lock" : "ti-hash"}`} />
              </span>
              <input
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. frontend-dev"
                className="w-full bg-white border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg pl-8 pr-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 transition-all box-border"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-500">
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <input
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="What's this channel about?"
              className="w-full bg-white border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 transition-all"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13px] text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg border-none cursor-pointer transition-colors font-inherit"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.name.trim()}
              className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border-none cursor-pointer transition-colors font-inherit"
            >
              {loading ? "Creating…" : "Create Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}