import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import LogHoursForm from "@/components/LogHoursForm";

export default async function LogHoursPage({
  searchParams,
}: {
  searchParams: Promise<{ shiftId?: string; date?: string; companyId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { shiftId, date, companyId: companyIdParam } = await searchParams;

  // Resolve company: explicit param > last-used cookie > most recent
  let company = null;
  const candidateId = companyIdParam ?? (await cookies()).get("lastCompanyId")?.value;

  if (candidateId) {
    const c = await prisma.company.findUnique({ where: { id: candidateId } });
    if (c && c.userId === session.userId) company = c;
  }

  if (!company) {
    company = await prisma.company.findFirst({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!company) redirect("/company/setup");

  const backHref = `/dashboard/${company.id}`;
  const today = new Date().toISOString().split("T")[0];

  // Edit mode
  if (shiftId) {
    const shift = await prisma.shiftLog.findUnique({ where: { id: shiftId } });
    if (!shift || shift.companyId !== company.id) notFound();

    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="px-4 pt-12 pb-6 flex items-center justify-between border-b border-zinc-100">
          <h1 className="text-2xl font-bold text-zinc-900">Edit shift</h1>
          <Link href={backHref} className="text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg active:bg-zinc-200 transition-colors">
            ← Back
          </Link>
        </div>
        <div className="px-4 pt-6 pb-12">
          <LogHoursForm
            companyId={company.id}
            hourlyRate={Number(company.hourlyRate)}
            overtimeMultiplier={Number(company.overtimeMultiplier)}
            breakMinutes={company.breakMinutes}
            shiftPremiumRate={Number(company.shiftPremiumRate)}
            defaultDate={shift.workDate.toISOString().split("T")[0]}
            defaultStart={shift.startTime}
            defaultEnd={shift.endTime}
            defaultNote={shift.note ?? ""}
            defaultPremium={Number(shift.premiumPay) > 0}
            shiftId={shift.id}
            redirectTo={backHref}
          />
        </div>
      </div>
    );
  }

  // Create mode
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="px-4 pt-12 pb-6 flex items-center justify-between border-b border-zinc-100">
        <h1 className="text-2xl font-bold text-zinc-900">Log hours</h1>
        <Link href={backHref} className="text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg active:bg-zinc-200 transition-colors">
          ← Back
        </Link>
      </div>
      <div className="px-4 pt-6 pb-12">
        <LogHoursForm
          companyId={company.id}
          hourlyRate={Number(company.hourlyRate)}
          overtimeMultiplier={Number(company.overtimeMultiplier)}
          breakMinutes={company.breakMinutes}
          shiftPremiumRate={Number(company.shiftPremiumRate)}
          defaultDate={date ?? today}
          defaultStart={company.startTime}
          defaultEnd={company.endTime}
          defaultPremium={Number(company.shiftPremiumRate) > 0}
          redirectTo={backHref}
        />
      </div>
    </div>
  );
}
