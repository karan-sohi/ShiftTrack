import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPeriodForDate, isLocked, countWorkdaysInPeriod } from "@/lib/pay-period";
import { computeShiftHours } from "@/lib/overtime";

function fmt(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtFull(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function fmtCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtHours(h: number) {
  return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)}h`;
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const company = await prisma.company.findFirst({
    where: { userId: session.userId, isActive: true },
  }) ?? await prisma.company.findFirst({ where: { userId: session.userId } });

  if (!company) redirect("/company/setup");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const period = getPeriodForDate(today, company.anchorPayday);
  const locked = isLocked(period);
  const periodEndStr = period.periodEnd.toISOString().split("T")[0];

  const shifts = await prisma.shiftLog.findMany({
    where: { companyId: company.id, workDate: { gte: period.periodStart, lte: period.periodEnd } },
    orderBy: { workDate: "desc" },
  });

  const todayShift = shifts.find(
    (s) => s.workDate.toISOString().split("T")[0] === todayStr
  );

  const isTodayWorkday = company.workdays.includes(today.getDay());
  const shiftLength = computeShiftHours(company.startTime, company.endTime);

  // Period stats
  const totalHours = shifts.reduce((s, r) => s + Number(r.hoursWorked), 0);
  const totalOT = shifts.reduce((s, r) => s + Number(r.overtimeHours), 0);
  const regularHours = totalHours - totalOT;
  const rate = Number(company.hourlyRate);
  const mult = Number(company.overtimeMultiplier);
  const regularPay = regularHours * rate;
  const otPay = totalOT * rate * mult;
  const totalPay = regularPay + otPay;

  const workdaysInPeriod = countWorkdaysInPeriod(period.periodStart, period.periodEnd, company.workdays);
  const expectedHours = workdaysInPeriod * shiftLength;
  const progressPct = expectedHours > 0 ? Math.min(100, (totalHours / expectedHours) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">ShiftTrack</p>
          <h1 className="text-xl font-bold text-zinc-900 mt-0.5">{company.name}</h1>
        </div>
        {!locked && (
          <Link
            href="/log-hours"
            className="bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-xl active:bg-zinc-700"
          >
            + Log hours
          </Link>
        )}
      </div>

      {/* Today */}
      <section className="px-4 mt-2">
        <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Today</p>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <p className="font-medium text-zinc-900 text-sm">{fmtFull(today)}</p>

          {isTodayWorkday ? (
            <p className="text-sm text-zinc-500 mt-1">
              Scheduled {company.startTime} – {company.endTime} · {fmtHours(shiftLength)}
            </p>
          ) : (
            <p className="text-sm text-zinc-400 mt-1">Not a scheduled workday</p>
          )}

          {todayShift ? (
            <div className="mt-3 flex items-center justify-between bg-green-50 rounded-xl px-3 py-2">
              <p className="text-sm text-green-700 font-medium">
                Logged {todayShift.startTime} – {todayShift.endTime} · {fmtHours(Number(todayShift.hoursWorked))}
              </p>
              <Link href={`/log-hours?shiftId=${todayShift.id}`} className="text-xs text-zinc-500 underline underline-offset-2">
                Edit
              </Link>
            </div>
          ) : isTodayWorkday && !locked ? (
            <Link
              href={`/log-hours?date=${todayStr}`}
              className="mt-3 flex items-center justify-center h-11 rounded-xl bg-zinc-900 text-white text-sm font-medium"
            >
              Log today's hours
            </Link>
          ) : null}
        </div>
      </section>

      {/* Pay period + progress */}
      <section className="px-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-400 uppercase tracking-wide">Pay period</p>
          {locked && (
            <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">Locked</span>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">
            {fmt(period.periodStart)} – {fmt(period.periodEnd)}
            <span className="text-zinc-400"> · Payday {fmt(period.payday)}</span>
          </p>

          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-zinc-500">Hours worked</span>
              <span className="font-semibold text-zinc-900">{fmtHours(totalHours)}</span>
            </div>
            <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-900 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              {fmtHours(expectedHours)} expected · {workdaysInPeriod} workdays
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-100 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Regular ({fmtHours(regularHours)} × {fmtCurrency(rate)})</span>
              <span className="text-zinc-700">{fmtCurrency(regularPay)}</span>
            </div>
            {totalOT > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Overtime ({fmtHours(totalOT)} × ×{mult})</span>
                <span className="text-zinc-700">{fmtCurrency(otPay)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-zinc-100">
              <span className="text-zinc-900">Estimated total</span>
              <span className="text-zinc-900">{fmtCurrency(totalPay)}</span>
            </div>
          </div>

          <Link
            href={`/payday/${periodEndStr}`}
            className="mt-4 flex items-center justify-center h-10 rounded-xl bg-zinc-100 text-zinc-700 text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            View payday summary →
          </Link>
        </div>
      </section>

      {/* Shifts list */}
      <section className="px-4 mt-4">
        <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">This period's shifts</p>
        {shifts.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-10">No shifts logged yet this period.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {shifts.map((s) => {
              const ot = Number(s.overtimeHours);
              const hrs = Number(s.hoursWorked);
              const pay = (hrs - ot) * rate + ot * rate * mult;
              return (
                <Link
                  key={s.id}
                  href={locked ? "#" : `/log-hours?shiftId=${s.id}`}
                  className="bg-white rounded-2xl border border-zinc-200 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {s.workDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">{s.startTime} – {s.endTime}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-900">{fmtHours(hrs)}</p>
                    <p className="text-xs text-zinc-400">{fmtCurrency(pay)}</p>
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
