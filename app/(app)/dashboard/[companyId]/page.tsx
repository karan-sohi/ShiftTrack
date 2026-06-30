import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPeriodForDate, isLocked, countWorkdaysInPeriod } from "@/lib/pay-period";
import { computeShiftHours } from "@/lib/overtime";
import DashboardTabs, { type PeriodData } from "@/components/DashboardTabs";
import SetLastCompany from "@/components/SetLastCompany";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
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

export default async function CompanyDashboardPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { companyId } = await params;

  const [company, user] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, username: true },
    }),
  ]);

  if (!company || company.userId !== session.userId) notFound();

  const userInitial = ((user?.username ?? user?.email) ?? "?")[0].toUpperCase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  const rate = Number(company.hourlyRate);
  const mult = Number(company.overtimeMultiplier);
  const shiftLength = computeShiftHours(company.startTime, company.endTime, company.breakMinutes);

  // Compute 3 periods
  const periodCurrent = getPeriodForDate(today, company.anchorPayday);
  const dayBeforeLast = new Date(periodCurrent.periodStart);
  dayBeforeLast.setDate(dayBeforeLast.getDate() - 1);
  const periodLast = getPeriodForDate(dayBeforeLast, company.anchorPayday);
  const dayBeforePrev = new Date(periodLast.periodStart);
  dayBeforePrev.setDate(dayBeforePrev.getDate() - 1);
  const periodPrev = getPeriodForDate(dayBeforePrev, company.anchorPayday);

  // Fetch shifts for all 3 periods in parallel
  const [shiftsCurrent, shiftsLast, shiftsPrev] = await Promise.all([
    prisma.shiftLog.findMany({
      where: { companyId, workDate: { gte: periodCurrent.periodStart, lte: periodCurrent.periodEnd } },
      orderBy: { workDate: "desc" },
    }),
    prisma.shiftLog.findMany({
      where: { companyId, workDate: { gte: periodLast.periodStart, lte: periodLast.periodEnd } },
      orderBy: { workDate: "desc" },
    }),
    prisma.shiftLog.findMany({
      where: { companyId, workDate: { gte: periodPrev.periodStart, lte: periodPrev.periodEnd } },
      orderBy: { workDate: "desc" },
    }),
  ]);

  function buildPeriodData(
    label: string,
    period: typeof periodCurrent,
    shifts: typeof shiftsCurrent,
  ): PeriodData {
    const totalHours   = shifts.reduce((s, r) => s + Number(r.hoursWorked), 0);
    const totalOT      = shifts.reduce((s, r) => s + Number(r.overtimeHours), 0);
    const totalPremium = shifts.reduce((s, r) => s + Number(r.premiumPay), 0);
    const regularHours = totalHours - totalOT;
    const regularPay   = regularHours * rate;
    const otPay        = totalOT * rate * mult;
    const totalPay     = regularPay + otPay + totalPremium;
    const workdaysInPeriod = countWorkdaysInPeriod(period.periodStart, period.periodEnd, company!.workdays);
    const expectedHours    = workdaysInPeriod * shiftLength;

    return {
      label,
      periodStart:       toDateStr(period.periodStart),
      periodEnd:         toDateStr(period.periodEnd),
      payday:            toDateStr(period.payday),
      locked:            isLocked(period),
      periodEndStr:      toDateStr(period.periodEnd),
      totalHours,
      totalOT,
      totalPremium,
      regularHours,
      regularPay,
      otPay,
      totalPay,
      workdaysInPeriod,
      expectedHours,
      shifts: shifts.map((s) => ({
        id:            s.id,
        workDate:      toDateStr(s.workDate),
        startTime:     s.startTime,
        endTime:       s.endTime,
        hoursWorked:   Number(s.hoursWorked),
        overtimeHours: Number(s.overtimeHours),
        premiumPay:    Number(s.premiumPay),
        note:          s.note ?? null,
      })),
    };
  }

  const periods: PeriodData[] = [
    buildPeriodData("Current", periodCurrent, shiftsCurrent),
    buildPeriodData("Last",    periodLast,    shiftsLast),
    buildPeriodData("Previous", periodPrev,   shiftsPrev),
  ];

  // Today info
  const todayShift = shiftsCurrent.find((s) => toDateStr(s.workDate) === todayStr);
  const isTodayWorkday = company.workdays.includes(today.getDay());
  const lockedCurrent = isLocked(periodCurrent);

  return (
    <div className="min-h-screen bg-zinc-50 pb-28">
      <SetLastCompany companyId={companyId} />

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
          {!lockedCurrent && (
            <Link
              href={`/log-hours?companyId=${companyId}`}
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
                href={`/log-hours?shiftId=${todayShift.id}&companyId=${companyId}`}
                className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg"
              >
                Edit
              </Link>
            </div>
          ) : isTodayWorkday && !lockedCurrent ? (
            <Link
              href={`/log-hours?date=${todayStr}&companyId=${companyId}`}
              className="mt-3 flex items-center justify-center h-11 rounded-xl bg-zinc-900 text-white text-sm font-semibold shadow-sm active:bg-zinc-700 transition-colors"
            >
              Log today's hours
            </Link>
          ) : null}
        </div>
      </section>

      {/* 3-tab period view */}
      <section className="mt-2">
        <div className="px-4 mt-2">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Pay periods</p>
        </div>
        <DashboardTabs periods={periods} companyId={companyId} rate={rate} mult={mult} />
      </section>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 flex">
        <Link
          href="/companies"
          className="flex-1 flex flex-col items-center py-3.5 text-zinc-500 active:bg-zinc-50 transition-colors"
        >
          <span className="text-xs font-medium">Companies</span>
        </Link>
        <div className="w-px bg-zinc-200" />
        <Link
          href="/reminders"
          className="flex-1 flex flex-col items-center py-3.5 text-zinc-500 active:bg-zinc-50 transition-colors"
        >
          <span className="text-xs font-medium">Reminders</span>
        </Link>
        <div className="w-px bg-zinc-200" />
        <Link
          href={`/company/${companyId}/edit`}
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
