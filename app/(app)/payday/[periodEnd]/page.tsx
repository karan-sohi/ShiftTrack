import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPeriodForDate, isLocked } from "@/lib/pay-period";
import { calculateCanadaPeriodTax, periodsPerYear } from "@/lib/tax";

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

  const [company, taxProfile] = await Promise.all([
    prisma.company.findFirst({
      where: { userId: session.userId, isActive: true },
      orderBy: { createdAt: "desc" },
    }).then(c => c ?? prisma.company.findFirst({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    })),
    prisma.taxProfile.findUnique({ where: { userId: session.userId } }),
  ]);

  if (!company) redirect("/company/setup");

  const parts = periodEndStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) notFound();
  const periodEndDate = new Date(parts[0], parts[1] - 1, parts[2]);

  const period = getPeriodForDate(periodEndDate, company.anchorPayday);
  if (period.periodEnd.toISOString().split("T")[0] !== periodEndStr) notFound();

  const locked = isLocked(period);
  const rate = Number(company.hourlyRate);
  const mult = Number(company.overtimeMultiplier);

  const shifts = await prisma.shiftLog.findMany({
    where: { companyId: company.id, workDate: { gte: period.periodStart, lte: period.periodEnd } },
    orderBy: { workDate: "asc" },
  });

  let totalHours = 0, totalOT = 0, totalPremium = 0;
  for (const s of shifts) {
    totalHours   += Number(s.hoursWorked);
    totalOT      += Number(s.overtimeHours);
    totalPremium += Number(s.premiumPay);
  }
  const regularHours = totalHours - totalOT;
  const regularPay   = regularHours * rate;
  const otPay        = totalOT * rate * mult;
  const grossPay     = regularPay + otPay + totalPremium;

  // Tax calculation — only for CA with a province set
  const tax = (taxProfile?.country === "CA" && taxProfile.region)
    ? calculateCanadaPeriodTax(grossPay, periodsPerYear(company.payFrequency), taxProfile.region)
    : null;

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-start justify-between border-b border-zinc-100">
        <div>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest">ShiftTrack</p>
          <h1 className="text-2xl font-bold text-zinc-900 mt-0.5">Payday Summary</h1>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-zinc-500 mt-1.5 bg-zinc-100 px-3 py-1.5 rounded-lg active:bg-zinc-200 transition-colors">
          ← Back
        </Link>
      </div>

      {/* Period header */}
      <section className="px-4 mt-4">
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700">
                {fmt(period.periodStart)} – {fmt(period.periodEnd)}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">Payday {fmt(period.payday)}</p>
            </div>
            {locked ? (
              <span className="text-xs font-medium bg-zinc-900 text-white px-2.5 py-1 rounded-full">Final</span>
            ) : (
              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Finalizing</span>
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
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-2xl p-6 text-center shadow-lg">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-2">
            {locked ? "Gross pay" : "Estimated gross pay"}
          </p>
          <p className="text-5xl font-bold text-white tracking-tight">{fmtCurrency(grossPay)}</p>
          <p className="text-sm text-zinc-400 mt-2">
            {fmtHours(totalHours)} · {shifts.length} shift{shifts.length !== 1 ? "s" : ""}
            {tax && (
              <span className="ml-2 text-zinc-300">· est. net {fmtCurrency(tax.netPay)}</span>
            )}
          </p>
        </div>
      </section>

      {/* Gross pay breakdown */}
      <section className="px-4 mt-4">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Pay breakdown</p>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Regular ({fmtHours(regularHours)} × {fmtCurrency(rate)})</span>
            <span className="font-medium text-zinc-900">{fmtCurrency(regularPay)}</span>
          </div>
          {totalOT > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Overtime ({fmtHours(totalOT)} × ×{mult})</span>
              <span className="font-medium text-zinc-900">{fmtCurrency(otPay)}</span>
            </div>
          )}
          {totalPremium > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Shift premium</span>
              <span className="font-medium text-zinc-900">{fmtCurrency(totalPremium)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold pt-2 border-t border-zinc-100">
            <span className="text-zinc-900">Gross total</span>
            <span className="text-zinc-900">{fmtCurrency(grossPay)}</span>
          </div>
        </div>
      </section>

      {/* Tax deductions — only shown when tax profile is set for CA */}
      {tax ? (
        <section className="px-4 mt-4">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">
            Estimated deductions · Canada · {tax.provinceName}
          </p>
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Federal income tax</span>
              <span className="font-medium text-red-600">−{fmtCurrency(tax.federalTax)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">{tax.provinceName} provincial tax</span>
              <span className="font-medium text-red-600">−{fmtCurrency(tax.provincialTax)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">{taxProfile!.region === "QC" ? "QPP" : "CPP"}</span>
              <span className="font-medium text-red-600">−{fmtCurrency(tax.cpp)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">EI</span>
              <span className="font-medium text-red-600">−{fmtCurrency(tax.ei)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-zinc-100">
              <span className="text-zinc-900">Total deductions</span>
              <span className="text-red-600">−{fmtCurrency(tax.totalDeductions)}</span>
            </div>
          </div>

          {/* Net pay card */}
          <div className="mt-3 bg-emerald-50 rounded-2xl border border-emerald-100 p-5 text-center">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
              Estimated net pay
            </p>
            <p className="text-4xl font-bold text-emerald-800">{fmtCurrency(tax.netPay)}</p>
          </div>

          <p className="mt-2 text-xs text-zinc-400 text-center px-4">
            Based on {tax.taxYear} Canadian tax rates. For informational purposes only — consult a tax professional for advice.
          </p>
        </section>
      ) : (
        !taxProfile && (
          <section className="px-4 mt-4">
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex items-center justify-between">
              <p className="text-sm text-zinc-500">Add your tax region to see estimated net pay.</p>
              <Link href="/account" className="text-sm font-semibold text-zinc-900 shrink-0 ml-3">
                Set up →
              </Link>
            </div>
          </section>
        )
      )}

      {/* Daily breakdown */}
      <section className="px-4 mt-4">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">
          Daily breakdown · {shifts.length} shift{shifts.length !== 1 ? "s" : ""}
        </p>
        {shifts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 text-center">
            <p className="text-sm text-zinc-400">No shifts logged this period.</p>
            {!locked && (
              <Link href="/log-hours" className="mt-3 inline-block text-sm font-semibold text-zinc-900 underline underline-offset-2">
                Log your first shift
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {shifts.map((s) => {
              const h       = Number(s.hoursWorked);
              const ot      = Number(s.overtimeHours);
              const premium = Number(s.premiumPay);
              const dayPay  = (h - ot) * rate + ot * rate * mult + premium;
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{fmtFull(s.workDate)}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{s.startTime} – {s.endTime}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-900">{fmtCurrency(dayPay)}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{fmtHours(h)}</p>
                    </div>
                  </div>
                  {(ot > 0 || premium > 0) && (
                    <div className="mt-2 flex gap-1.5">
                      {ot > 0 && (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          {fmtHours(ot)} OT
                        </span>
                      )}
                      {premium > 0 && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          +{fmtCurrency(premium)} premium
                        </span>
                      )}
                    </div>
                  )}
                  {s.note && <p className="mt-2 text-xs text-zinc-400 italic">{s.note}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
