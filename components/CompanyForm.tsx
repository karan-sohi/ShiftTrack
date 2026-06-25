"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIMEZONES = [
  { value: "America/New_York",    label: "Eastern (ET)" },
  { value: "America/Chicago",     label: "Central (CT)" },
  { value: "America/Denver",      label: "Mountain (MT)" },
  { value: "America/Phoenix",     label: "Mountain — no DST (AZ)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage",   label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu",    label: "Hawaii (HT)" },
  { value: "UTC",                 label: "UTC" },
];

export type CompanyFormData = {
  name: string;
  startTime: string;
  endTime: string;
  workdays: number[];
  hourlyRate: string;
  overtimeRule: "NONE" | "DAILY_OVER_8" | "WEEKLY_OVER_40";
  overtimeMultiplier: string;
  anchorPayday: string;
  timezone: string;
  breakMinutes: number;
};

type Props = {
  initial?: Partial<CompanyFormData>;
  companyId?: string;
  redirectTo?: string;
};

const BREAK_OPTIONS = [
  { value: 0,  label: "No break" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
];

const DEFAULTS: CompanyFormData = {
  name: "",
  startTime: "09:00",
  endTime: "17:00",
  workdays: [1, 2, 3, 4, 5],
  hourlyRate: "",
  overtimeRule: "NONE",
  overtimeMultiplier: "1.5",
  anchorPayday: "",
  timezone: "America/Chicago",
  breakMinutes: 0,
};

export default function CompanyForm({ initial, companyId, redirectTo = "/" }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<CompanyFormData>({ ...DEFAULTS, ...initial });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEdit = Boolean(companyId);
  const isOvernight = form.endTime <= form.startTime;

  function set<K extends keyof CompanyFormData>(key: K, val: CompanyFormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function toggleDay(day: number) {
    set(
      "workdays",
      form.workdays.includes(day)
        ? form.workdays.filter((d) => d !== day)
        : [...form.workdays, day].sort((a, b) => a - b)
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const rate = parseFloat(form.hourlyRate);
    if (!form.name.trim()) return setError("Company name required");
    if (isNaN(rate) || rate <= 0) return setError("Hourly rate must be greater than 0");
    if (form.workdays.length === 0) return setError("Select at least one workday");
    if (!form.anchorPayday) return setError("Anchor payday required");

    setLoading(true);

    const payload = {
      name: form.name.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
      workdays: form.workdays,
      hourlyRate: rate,
      overtimeRule: form.overtimeRule,
      overtimeMultiplier: parseFloat(form.overtimeMultiplier) || 1.5,
      anchorPayday: form.anchorPayday,
      timezone: form.timezone,
      breakMinutes: form.breakMinutes,
    };

    const res = await fetch(
      isEdit ? `/api/companies/${companyId}` : "/api/companies",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    setLoading(false);

    if (res.status === 401) { router.push("/login"); return; }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Company name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Company name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Acme Corp"
          className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900
                     placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      {/* Schedule */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-zinc-700">Shift schedule</p>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs text-zinc-500">Start time</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => set("startTime", e.target.value)}
              className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900
                         focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs text-zinc-500">End time</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => set("endTime", e.target.value)}
              className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900
                         focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </div>
        {isOvernight && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            Overnight shift — ends the following day
          </p>
        )}
      </div>

      {/* Unpaid break */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-700">Unpaid break</p>
        <div className="flex gap-2 flex-wrap">
          {BREAK_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => set("breakMinutes", value)}
              className={`h-10 px-4 rounded-xl text-sm font-medium border transition-colors
                          ${form.breakMinutes === value
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white text-zinc-600 border-zinc-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-400">Deducted from every logged shift</p>
      </div>

      {/* Workdays */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-700">Work days</p>
        <div className="flex gap-2">
          {DAYS.map((day, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={`flex-1 h-10 rounded-xl text-xs font-medium transition-colors ${
                form.workdays.includes(i)
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Hourly rate */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Hourly rate ($)</label>
        <input
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={form.hourlyRate}
          onChange={(e) => set("hourlyRate", e.target.value)}
          placeholder="25.00"
          className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900
                     placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      {/* Overtime */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-zinc-700">Overtime rule</p>
        <div className="flex flex-col gap-2">
          {(
            [
              ["NONE", "No overtime"],
              ["DAILY_OVER_8", "Daily over 8 hours"],
              ["WEEKLY_OVER_40", "Weekly over 40 hours"],
            ] as const
          ).map(([val, label]) => (
            <label key={val} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="overtimeRule"
                value={val}
                checked={form.overtimeRule === val}
                onChange={() => set("overtimeRule", val)}
                className="accent-zinc-900"
              />
              <span className="text-sm text-zinc-700">{label}</span>
            </label>
          ))}
        </div>

        {form.overtimeRule !== "NONE" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500">Overtime multiplier</label>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              step="0.25"
              value={form.overtimeMultiplier}
              onChange={(e) => set("overtimeMultiplier", e.target.value)}
              className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900
                         focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        )}
      </div>

      {/* Anchor payday */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Anchor payday</label>
        <p className="text-xs text-zinc-400">Enter your next or most recent payday date.</p>
        <input
          type="date"
          value={form.anchorPayday}
          onChange={(e) => set("anchorPayday", e.target.value)}
          className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900
                     focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      {/* Timezone */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Timezone</label>
        <select
          value={form.timezone}
          onChange={(e) => set("timezone", e.target.value)}
          className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900
                     focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          {TIMEZONES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <p className="text-xs text-zinc-400">Used for reminder timing</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="h-12 rounded-xl bg-zinc-900 text-white font-medium text-sm
                   disabled:opacity-50 active:bg-zinc-700 transition-colors"
      >
        {loading ? "Saving…" : isEdit ? "Save changes" : "Create company"}
      </button>
    </form>
  );
}
