import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import RemindersForm from "@/components/RemindersForm";

export default async function RemindersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");

  const company = await prisma.company.findFirst({
    where: { userId: session.userId, isActive: true },
  }) ?? await prisma.company.findFirst({ where: { userId: session.userId } });

  if (!company) redirect("/company/setup");

  const settings = await prisma.reminderSettings.findUnique({
    where: { companyId: company.id },
  });

  const recentLogs = await prisma.reminderLog.findMany({
    where: { companyId: company.id },
    orderBy: { sentAt: "desc" },
    take: 10,
  });

  const enabled = settings?.enabled ?? false;
  const delayHours = settings?.delayHours ?? 3;
  const notifyEmail = settings?.notifyEmail ?? null;

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">ShiftTrack</p>
          <h1 className="text-xl font-bold text-zinc-900 mt-0.5">Reminders</h1>
        </div>
        <Link href="/dashboard" className="text-sm text-zinc-400 underline underline-offset-2 mt-1">
          ← Back
        </Link>
      </div>

      <section className="px-4 mt-2">
        <RemindersForm
          initialEnabled={enabled}
          initialDelayHours={delayHours}
          initialNotifyEmail={notifyEmail}
          userEmail={user.email}
        />
      </section>

      {/* Recent reminders log */}
      {recentLogs.length > 0 && (
        <section className="px-4 mt-8">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">
            Recent reminders sent
          </p>
          <div className="flex flex-col gap-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-2xl border border-zinc-200 px-4 py-3 flex items-center justify-between"
              >
                <p className="text-sm text-zinc-900">
                  {log.workDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
                <p className="text-xs text-zinc-400">
                  {log.sentAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
