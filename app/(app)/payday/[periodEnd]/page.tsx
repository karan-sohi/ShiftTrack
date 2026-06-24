import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPeriodForDate, isLocked } from "@/lib/pay-period";

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtFull(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtHours(h: number) {
  return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(2)}h`;
}

export default async function PaydaySummaryPage({
  params,
}: {
  params: Promise<{ periodEnd: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { periodEnd: periodEndStr } = await params;

  const company = await prisma.company.findFirst({
    where: { userId: session.userId, isActive: true },
  }) ?? await prisma.company.findFirst({ where: { userId: session.userId } });

  if (!company) redirect("/company/setup");

  // Parse periodEnd as local date
  const parts = periodEndStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) notFound();
  const periodEndDate = new Date(parts[0], parts[1] - 1, parts[2]);

  const period = getPeriodForDate(periodEndDate, company.anchorPayday);
  // Ensure the URL period actually matches this company's calendar
  const computedEnd = period.periodEnd.toISOString().split("T")[0];
  if (computedEnd !== periodEndStr) notFound();

  const locked = isLocked(period);
  const rate = Number(company.hourlyRate);
  const mult = Number(company.overtimeMultiplier);

  const shifts = await prisma.shiftLog.findMany({
    where: {
      companyId: company.id,
      workDate: { gte: period.periodStart, lte: period.periodEnd },
    },
    orderBy: { workDate: "asc" },
  });

  // Compute totals
  let totalHours = 0;
  let totalOT = 0;
  for (const s of shifts) {
    totalHours += Number(s.hoursWorked);
    totalOT += Number(s.overtimeHours);
  }
  const regularHours = totalHours - totalOT;
  const regularPay = regularHours * rate;
  const otPay = totalOT * rate * mult;
  const grossPay = regularPay + otPay;

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">ShiftTrack</p>
          <h1 className="text-xl font-bold text-zinc-900 mt-0.5">Payday Summary</h1>
        </div>
        <Link href="/dashboard" className="text-sm text-zinc-400 underline underline-offset-2 mt-1">
          ← Back
        </Link>
      </div>

      {/* Period header card */}
      <section className="px-4 mt-2">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">
                {fmt(period.periodStart)} – {fmt(period.periodEnd)}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">Payday {fmt(period.payday)}</p>
            </div>
            {locked ? (
              <span className="text-xs font-medium bg-zinc-900 text-white px-2.5 py-1 rounded-full">
                Final
              </span>
            ) : (
              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                Finalizing
              </span>
            )}
          </div>

          {!locked && (
            <p className="mt-3 text-xs text-zinc-400">
              Locks on {fmt(period.lockAt)} — keep logging shifts until then.
            </p>
          )}
        </div>
      </section>

      {/* Gross pay hero */}
      <section className="px-4 mt-4">
        <div className="bg-zinc-900 rounded-2xl p-5 text-center">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">
            {locked ? "Gross pay" : "Estimated gross pay"}
          </p>
          <p className="text-4xl font-bold text-white">{fmtCurrency(grossPay)}</p>
          <p className="text-sm text-zinc-400 mt-1">{fmtHours(totalHours)} total</p>
        </div>
      </section>

      {/* Pay breakdown */}
      <section className="px-4 mt-4">
        <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Pay breakdown</p>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">
              Regular ({fmtHours(regularHours)} × {fmtCurrency(rate)})
            </span>
            <span className="font-medium text-zinc-900">{fmtCurrency(regularPay)}</span>
          </div>
          {totalOT > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">
                Overtime ({fmtHours(totalOT)} × ×{mult})
              </span>
              <span className="font-medium text-zinc-900">{fmtCurrency(otPay)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold pt-2 border-t border-zinc-100">
            <span className="text-zinc-900">Total</span>
            <span className="text-zinc-900">{fmtCurrency(grossPay)}</span>
          </div>
        </div>
      </section>

      {/* Daily breakdown */}
      <section className="px-4 mt-4">
        <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">
          Daily breakdown · {shifts.length} shift{shifts.length !== 1 ? "s" : ""}
        </p>
        {shifts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center">
            <p className="text-sm text-zinc-400">No shifts logged this period.</p>
            {!locked && (
              <Link
                href="/log-hours"
                className="mt-3 inline-block text-sm font-medium text-zinc-900 underline underline-offset-2"
              >
                Log your first shift
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {shifts.map((s) => {
              const h = Number(s.hoursWorked);
              const ot = Number(s.overtimeHours);
              const reg = h - ot;
              const dayPay = reg * rate + ot * rate * mult;
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-zinc-200 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {fmtFull(s.workDate)}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {s.startTime} – {s.endTime}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-900">{fmtCurrency(dayPay)}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{fmtHours(h)}</p>
                    </div>
                  </div>
                  {ot > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                        {fmtHours(ot)} OT
                      </span>
                    </div>
                  )}
                  {s.note && (
                    <p className="mt-2 text-xs text-zinc-400 italic">{s.note}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
