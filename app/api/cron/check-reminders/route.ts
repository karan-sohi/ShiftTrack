import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendReminderEmail } from "@/lib/email";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

// Returns (local_time_ms - utc_time_ms) / 60000 for the given timezone at `at`.
// e.g. America/Chicago CDT (UTC-5) → -300
function tzOffsetMinutes(timezone: string, at: Date): number {
  const localStr = at.toLocaleString("en-US", { timeZone: timezone });
  const utcStr  = at.toLocaleString("en-US", { timeZone: "UTC" });
  return (new Date(localStr).getTime() - new Date(utcStr).getTime()) / 60000;
}

// Compute the UTC timestamp for when a shift ends, accounting for company timezone.
// workDate is UTC midnight for the shift's start date.
// endTime / startTime are "HH:MM" in the company's local timezone.
function shiftEndUTC(
  workDate: Date,
  startTime: string,
  endTime: string,
  timezone: string
): Date {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  // Determine which calendar date the shift ends on (in company timezone)
  const isOvernight = eh * 60 + em <= sh * 60 + sm;
  let endDateUTC = new Date(workDate); // UTC midnight of start date
  if (isOvernight) endDateUTC = new Date(endDateUTC.getTime() + 24 * 60 * 60 * 1000);

  // Find what UTC time corresponds to 00:00 local on endDate.
  // offsetMin = local - UTC, so UTC midnight_local = UTC midnight - offsetMin
  const offsetMin = tzOffsetMinutes(timezone, endDateUTC);
  const localMidnightUTC = endDateUTC.getTime() - offsetMin * 60000;

  // Add the end-time hours/minutes
  return new Date(localMidnightUTC + (eh * 60 + em) * 60000);
}

export async function GET(req: NextRequest) {
  // Vercel sends: Authorization: Bearer {CRON_SECRET}
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const lookbackDays = 2; // today + yesterday (covers late-night shifts that end past midnight)

  const allSettings = await prisma.reminderSettings.findMany({
    where: { enabled: true },
    include: {
      company: {
        include: { user: true },
      },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const s of allSettings) {
    const { company } = s;
    const notifyEmail = s.notifyEmail ?? company.user.email;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    for (let i = 0; i < lookbackDays; i++) {
      // Build UTC midnight date for (today - i days)
      const dayMs = now.getTime() - i * 24 * 60 * 60 * 1000;
      const dateStr = toDateStr(new Date(dayMs));
      const workDate = new Date(dateStr); // UTC midnight, matches stored ShiftLog.workDate

      // Skip if not a scheduled workday
      if (!company.workdays.includes(workDate.getUTCDay())) {
        skipped++;
        continue;
      }

      // Skip if shift hasn't exceeded delay window yet
      const shiftEnd = shiftEndUTC(workDate, company.startTime, company.endTime, company.timezone);
      const cutoff = new Date(shiftEnd.getTime() + s.delayHours * 60 * 60 * 1000);
      if (now < cutoff) {
        skipped++;
        continue;
      }

      // Skip if a shift was already logged for this date
      const hasShift = await prisma.shiftLog.findFirst({
        where: { companyId: company.id, workDate },
      });
      if (hasShift) {
        skipped++;
        continue;
      }

      // Skip if a reminder was already sent for this date (idempotency)
      const alreadySent = await prisma.reminderLog.findFirst({
        where: { companyId: company.id, workDate },
      });
      if (alreadySent) {
        skipped++;
        continue;
      }

      // Send reminder
      await sendReminderEmail(notifyEmail, {
        companyName: company.name,
        workDate,
        startTime: company.startTime,
        endTime: company.endTime,
        logUrl: `${appUrl}/log-hours?date=${dateStr}`,
      });

      await prisma.reminderLog.create({
        data: { companyId: company.id, workDate },
      });

      sent++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
