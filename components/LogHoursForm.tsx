"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  companyId: string;
  hourlyRate: number;
  overtimeMultiplier: number;
  breakMinutes: number;
  shiftPremiumRate: number;
  defaultDate: string;
  defaultStart: string;
  defaultEnd: string;
  // edit mode
  shiftId?: string;
  defaultNote?: string;
  defaultPremium?: boolean;
};

function shiftHours(start: string, end: string, breakMinutes: number): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let endMin = eh * 60 + em;
  const startMin = sh * 60 + sm;
  if (endMin <= startMin) endMin += 24 * 60;
  return Math.max(0, (endMin - startMin - breakMinutes) / 60);
}

function fmtCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function LogHoursForm({
  companyId,
  hourlyRate,
  breakMinutes,
  shiftPremiumRate,
  defaultDate,
  defaultStart,
  defaultEnd,
  shiftId,
  defaultNote = "",
  defaultPremium = false,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(shiftId);

  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [note, setNote] = useState(defaultNote);
  const [applyPremium, setApplyPremium] = useState(defaultPremium);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const hours = start && end ? shiftHours(start, end, breakMinutes) : 0;
  const isOvernight = end <= start;
  const premiumPay = applyPremium ? shiftPremiumRate * hours : 0;
  const estimatedPay = hours * hourlyRate + premiumPay;

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!date || !start || !end) return setError("Date, start, and end time required");

    setLoading(true);
    const res = await fetch(isEdit ? `/api/shifts/${shiftId}` : "/api/shifts", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        workDate: date,
        startTime: start,
        endTime: end,
        note: note || null,
        applyPremium,
      }),
    });

    setLoading(false);

    if (res.status === 401) { router.push("/login"); return; }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this shift? This can't be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/shifts/${shiftId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.status === 401) { router.push("/login"); return; }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Delete failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Work date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900
                     focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      {/* Times */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-sm font-medium text-zinc-700">Start</label>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900
                       focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-sm font-medium text-zinc-700">End</label>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900
                       focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
      </div>

      {isOvernight && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 -mt-2">
          Overnight shift — ends the following day
        </p>
      )}

      {/* Shift premium toggle */}
      {shiftPremiumRate > 0 && (
        <button
          type="button"
          onClick={() => setApplyPremium((v) => !v)}
          className={`h-12 rounded-xl border text-sm font-medium transition-colors flex items-center justify-between px-4
            ${applyPremium
              ? "bg-zinc-900 text-white border-zinc-900"
              : "bg-white text-zinc-600 border-zinc-200"}`}
        >
          <span>Shift premium (+{fmtCurrency(shiftPremiumRate)}/hr)</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${applyPremium ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"}`}>
            {applyPremium ? "Applied" : "Not applied"}
          </span>
        </button>
      )}

      {/* Live preview */}
      {hours > 0 && (
        <div className="bg-emerald-50 rounded-xl px-4 py-3.5 flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              {hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(2)} hours
            </p>
            <p className="text-xs text-emerald-700/70 mt-0.5">
              {breakMinutes > 0 ? `${breakMinutes} min break deducted · ` : ""}
              {applyPremium ? `incl. ${fmtCurrency(premiumPay)} premium · ` : ""}
              Estimated pay
            </p>
          </div>
          <p className="text-2xl font-bold text-emerald-800">{fmtCurrency(estimatedPay)}</p>
        </div>
      )}

      {/* Note */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Note <span className="text-zinc-400 font-normal">(optional)</span></label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. covered lunch shift"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 text-sm
                     placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="h-12 rounded-xl bg-zinc-900 text-white font-medium text-sm
                   disabled:opacity-50 active:bg-zinc-700 transition-colors"
      >
        {loading ? "Saving…" : isEdit ? "Save changes" : "Log hours"}
      </button>

      {isEdit && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="h-12 rounded-xl border border-red-200 text-red-600 font-medium text-sm
                     disabled:opacity-50 active:bg-red-50 transition-colors"
        >
          {deleting ? "Deleting…" : "Delete shift"}
        </button>
      )}
    </form>
  );
}
