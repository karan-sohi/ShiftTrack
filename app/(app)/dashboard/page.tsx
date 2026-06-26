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
    orderBy: { createdAt: "desc" },
  }) ?? await prisma.company.findFirst({ where: { userId: session.userId }, orderBy: { createdAt: "desc" } });

  if (!company) redirect("/company/setup");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, username: true },
  });
  const userInitial = ((user?.username ?? user?.email) ?? "?")[0].toUpperCase();

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

  type Shift = (typeof shifts)[number];

  const todayShift = shifts.find(
    (s: Shift) => s.workDate.toISOString().split("T")[0] === todayStr
  );

  const isTodayWorkday = company.workdays.includes(today.getDay());
  const shiftLength = computeShiftHours(company.startTime, company.endTime, company.breakMinutes);

  // Period stats
  const totalHours = shifts.reduce((sum: number, r: Shift) => sum + Number(r.hoursWorked), 0);
  const totalOT = shifts.reduce((sum: number, r: Shift) => sum + Number(r.overtimeHours), 0);
  const regularHours = totalHours - totalOT;
  const rate = Number(company.hourlyRate);
  const mult = Number(company.overtimeMultiplier);
  const totalPremium = shifts.reduce((sum: number, r: Shift) => sum + Number(r.premiumPay), 0);
  const regularPay = regularHours * rate;
  const otPay = totalOT * rate * mult;
  const totalPay = regularPay + otPay + totalPremium;

  const workdaysInPeriod = countWorkdaysInPeriod(period.periodStart, period.periodEnd, company.workdays);
  const expectedHours = workdaysInPeriod * shiftLength;
  const progressPct = expectedHours > 0 ? Math.min(100, (totalHours / expectedHours) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-50 pb-28">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between border-b border-zinc-100">
        <div>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest">ShiftTrack</p>
          <h1 className="text-2xl font-bold text-zinc-900 mt-0.5">{company.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/account"
            className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-white text-sm font-bold shrink-0 active:bg-zinc-700 transition-colors"
          >
            {userInitial}
          </Link>
          {!locked && (
            <Link
              href="/log-hours"
              className="bg-zinc-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm active:bg-zinc-700 transition-colors"
            >
              + Log hours
            </Link>
          )}
        </div>
      </div>

      {/* Today */}
      <section className="px-4 mt-4">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Today</p>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
          <p className="font-semibold text-zinc-900">{fmtFull(today)}</p>

          {isTodayWorkday ? (
            <p className="text-sm text-zinc-500 mt-1">
              Scheduled {company.startTime} – {company.endTime} · {fmtHours(shiftLength)}
            </p>
          ) : (
            <p className="text-sm text-zinc-400 mt-1">Not a scheduled workday</p>
          )}

          {todayShift ? (
            <div className="mt-3 flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2.5">
              <p className="text-sm text-emerald-700 font-medium">
                Logged {todayShift.startTime} – {todayShift.endTime} · {fmtHours(Number(todayShift.hoursWorked))}
              </p>
              <Link
                href={`/log-hours?shiftId=${todayShift.id}`}
                className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg"
              >
                Edit
              </Link>
            </div>
          ) : isTodayWorkday && !locked ? (
            <Link
              href={`/log-hours?date=${todayStr}`}
              className="mt-3 flex items-center justify-center h-11 rounded-xl bg-zinc-900 text-white text-sm font-semibold shadow-sm active:bg-zinc-700 transition-colors"
            >
              Log today's hours
            </Link>
          ) : null}
        </div>
      </section>

      {/* Pay period + progress */}
      <section className="px-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Pay period</p>
          {locked && (
            <span className="text-xs bg-zinc-100 text-zinc-500 px-2.5 py-0.5 rounded-full font-medium">Locked</span>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-700">
              {fmt(period.periodStart)} – {fmt(period.periodEnd)}
            </p>
            <p className="text-xs text-zinc-400">Payday {fmt(period.payday)}</p>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-500">Hours worked</span>
              <span className="font-bold text-zinc-900">{fmtHours(totalHours)}</span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              {fmtHours(expectedHours)} expected · {workdaysInPeriod} workdays
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-100 space-y-2.5">
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
            {totalPremium > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Shift premium</span>
                <span className="text-zinc-700">{fmtCurrency(totalPremium)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-zinc-100">
              <span className="text-sm font-semibold text-zinc-900">Estimated total</span>
              <span className="text-2xl font-bold text-zinc-900">{fmtCurrency(totalPay)}</span>
            </div>
          </div>

          <Link
            href={`/payday/${periodEndStr}`}
            className="mt-4 flex items-center justify-center h-11 rounded-xl bg-zinc-900 text-white text-sm font-semibold shadow-sm active:bg-zinc-700 transition-colors"
          >
            View payday summary →
          </Link>
        </div>
      </section>

      {/* Shifts list */}
      <section className="px-4 mt-4">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">This period's shifts</p>
        {shifts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 text-center">
            <p className="text-sm text-zinc-400">No shifts logged yet this period.</p>
            {!locked && (
              <Link
                href="/log-hours"
                className="mt-3 inline-block text-sm font-semibold text-zinc-900 underline underline-offset-2"
              >
                Log your first shift
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {shifts.map((s: Shift) => {
              const ot = Number(s.overtimeHours);
              const hrs = Number(s.hoursWorked);
              const premium = Number(s.premiumPay);
              const pay = (hrs - ot) * rate + ot * rate * mult + premium;
              return (
                <Link
                  key={s.id}
                  href={locked ? "#" : `/log-hours?shiftId=${s.id}`}
                  className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex items-center justify-between active:bg-zinc-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {s.workDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
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

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 flex">
        <Link
          href="/reminders"
          className="flex-1 flex flex-col items-center py-3.5 text-zinc-500 active:bg-zinc-50 transition-colors"
        >
          <span className="text-xs font-medium">Reminders</span>
        </Link>
        <div className="w-px bg-zinc-200" />
        <Link
          href={`/company/${company.id}/edit`}
          className="flex-1 flex flex-col items-center py-3.5 text-zinc-500 active:bg-zinc-50 transition-colors"
        >
          <span className="text-xs font-medium">Settings</span>
        </Link>
        <div className="w-px bg-zinc-200" />
        <Link
          href="/account"
          className="flex-1 flex flex-col items-center py-3.5 text-zinc-500 active:bg-zinc-50 transition-colors"
        >
          <span className="text-xs font-medium">Account</span>
        </Link>
      </nav>
    </div>
  );
}
