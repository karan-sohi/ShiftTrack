"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialEnabled: boolean;
  initialDelayHours: number;
  initialNotifyEmail: string | null;
  userEmail: string;
};

const DELAY_OPTIONS = [1, 2, 3, 4, 6, 12];

export default function RemindersForm({
  initialEnabled,
  initialDelayHours,
  initialNotifyEmail,
  userEmail,
}: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [delayHours, setDelayHours] = useState(initialDelayHours);
  const [notifyEmail, setNotifyEmail] = useState(initialNotifyEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    setSaved(false);
    setSaving(true);

    const res = await fetch("/api/reminders/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled,
        delayHours,
        notifyEmail: notifyEmail.trim() || null,
      }),
    });

    setSaving(false);

    if (res.status === 401) { router.push("/login"); return; }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to save");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Enable toggle */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900">Email reminders</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Get notified when you forget to log a shift
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                      transition-colors duration-200 focus:outline-none
                      ${enabled ? "bg-zinc-900" : "bg-zinc-200"}`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow
                        transition duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
      </div>

      {enabled && (
        <>
          {/* Delay hours */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Send reminder after
            </label>
            <div className="flex gap-2 flex-wrap">
              {DELAY_OPTIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setDelayHours(h)}
                  className={`h-10 px-4 rounded-xl text-sm font-medium border transition-colors
                              ${delayHours === h
                                ? "bg-zinc-900 text-white border-zinc-900"
                                : "bg-white text-zinc-700 border-zinc-200"}`}
                >
                  {h}h
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-400">
              Hours after your shift ends with no entry logged
            </p>
          </div>

          {/* Notify email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Send to
            </label>
            <input
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder={userEmail}
              className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900 text-sm
                         placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            <p className="text-xs text-zinc-400">
              Leave blank to use your account email ({userEmail})
            </p>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="h-12 rounded-xl bg-zinc-900 text-white font-medium text-sm
                   disabled:opacity-50 active:bg-zinc-700 transition-colors"
      >
        {saving ? "Saving…" : saved ? "Saved!" : "Save settings"}
      </button>
    </div>
  );
}
