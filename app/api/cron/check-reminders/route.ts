import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendReminderEmail } from "@/lib/email";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

// Compute the wall-clock end datetime for a scheduled shift on `workDate`.
// Handles overnight: if endTime <= startTime, the shift ends the following calendar day.
function shiftEndDatetime(workDate: Date, startTime: string, endTime: string): Date {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  // workDate is UTC midnight; use UTC arithmetic to stay consistent
  const end = new Date(workDate);
  end.setUTCHours(eh, em, 0, 0);
  if (eh * 60 + em <= sh * 60 + sm) {
    // overnight — ends next day
    end.setUTCDate(end.getUTCDate() + 1);
  }
  return end;
}

export async function GET(req: NextRequest) {
  // Vercel sends: Authorization: Bearer {CRON_SECRET}
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const lookbackDays = 7;

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
      const shiftEnd = shiftEndDatetime(workDate, company.startTime, company.endTime);
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
