"use client";

import { useState } from "react";
import Link from "next/link";

export type SerializedShift = {
  id: string;
  workDate: string;
  startTime: string;
  endTime: string;
  hoursWorked: number;
  overtimeHours: number;
  premiumPay: number;
  note: string | null;
};

export type PeriodData = {
  label: string;
  periodStart: string;
  periodEnd: string;
  payday: string;
  locked: boolean;
  periodEndStr: string;
  shifts: SerializedShift[];
  totalHours: number;
  totalOT: number;
  totalPremium: number;
  regularHours: number;
  regularPay: number;
  otPay: number;
  totalPay: number;
  workdaysInPeriod: number;
  expectedHours: number;
};

function fmt(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtFull(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtHours(h: number) {
  return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)}h`;
}

export default function DashboardTabs({
  periods,
  companyId,
  rate,
  mult,
}: {
  periods: PeriodData[];
  companyId: string;
  rate: number;
  mult: number;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const p = periods[activeTab];
  const progressPct = p.expectedHours > 0 ? Math.min(100, (p.totalHours / p.expectedHours) * 100) : 0;

  return (
    <div>
      {/* Tab strip */}
      <div className="px-4 mt-4">
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
          {periods.map((period, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                activeTab === i ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period card */}
      <section className="px-4 mt-3">
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-700">
              {fmt(p.periodStart)} – {fmt(p.periodEnd)}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-zinc-400">Payday {fmt(p.payday)}</p>
              {p.locked && (
                <span className="text-xs font-medium bg-zinc-900 text-white px-2 py-0.5 rounded-full">Final</span>
              )}
            </div>
          </div>

          {/* Progress bar — only meaningful for current */}
          {activeTab === 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-500">Hours worked</span>
                <span className="font-bold text-zinc-900">{fmtHours(p.totalHours)}</span>
              </div>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 mt-1.5">
                {fmtHours(p.expectedHours)} expected · {p.workdaysInPeriod} workdays
              </p>
            </div>
          )}

          {/* Pay breakdown */}
          <div className={`pt-4 ${activeTab === 0 ? "border-t border-zinc-100 mt-4" : ""} space-y-2.5`}>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Regular ({fmtHours(p.regularHours)} × {fmtCurrency(rate)})</span>
              <span className="text-zinc-700">{fmtCurrency(p.regularPay)}</span>
            </div>
            {p.totalOT > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Overtime ({fmtHours(p.totalOT)} × ×{mult})</span>
                <span className="text-zinc-700">{fmtCurrency(p.otPay)}</span>
              </div>
            )}
            {p.totalPremium > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Shift premium</span>
                <span className="text-zinc-700">{fmtCurrency(p.totalPremium)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-zinc-100">
              <span className="text-sm font-semibold text-zinc-900">
                {p.locked ? "Total" : "Estimated total"}
              </span>
              <span className="text-2xl font-bold text-zinc-900">{fmtCurrency(p.totalPay)}</span>
            </div>
          </div>

          <Link
            href={`/payday/${p.periodEndStr}`}
            className="mt-4 flex items-center justify-center h-11 rounded-xl bg-zinc-900 text-white text-sm font-semibold shadow-sm active:bg-zinc-700 transition-colors"
          >
            View payday summary →
          </Link>
        </div>
      </section>

      {/* Shifts list */}
      <section className="px-4 mt-4">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">
          {p.shifts.length} shift{p.shifts.length !== 1 ? "s" : ""}
        </p>
        {p.shifts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 text-center">
            <p className="text-sm text-zinc-400">No shifts logged this period.</p>
            {!p.locked && (
              <Link
                href={`/log-hours?companyId=${companyId}`}
                className="mt-3 inline-block text-sm font-semibold text-zinc-900 underline underline-offset-2"
              >
                Log your first shift
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {p.shifts.map((s) => {
              const ot = s.overtimeHours;
              const hrs = s.hoursWorked;
              const premium = s.premiumPay;
              const pay = (hrs - ot) * rate + ot * rate * mult + premium;
              return (
                <Link
                  key={s.id}
                  href={p.locked ? "#" : `/log-hours?shiftId=${s.id}&companyId=${companyId}`}
                  className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex items-center justify-between active:bg-zinc-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{fmtFull(s.workDate)}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{s.startTime} – {s.endTime}</p>
                    {(ot > 0 || premium > 0) && (
                      <div className="flex gap-1.5 mt-1.5">
                        {ot > 0 && (
                          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            {fmtHours(ot)} OT
                          </span>
                        )}
                        {premium > 0 && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            Premium
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-zinc-900">{fmtHours(hrs)}</p>
                    <p className="text-sm text-zinc-500 mt-0.5">{fmtCurrency(pay)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
