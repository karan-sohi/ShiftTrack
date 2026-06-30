import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CompanyForm from "@/components/CompanyForm";
import DeleteCompanyButton from "@/components/DeleteCompanyButton";
import type { CompanyFormData } from "@/components/CompanyForm";

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company || company.userId !== session.userId) notFound();

  const initial: Partial<CompanyFormData> = {
    name: company.name,
    startTime: company.startTime,
    endTime: company.endTime,
    workdays: company.workdays,
    hourlyRate: company.hourlyRate.toString(),
    overtimeRule: company.overtimeRule as CompanyFormData["overtimeRule"],
    overtimeMultiplier: company.overtimeMultiplier.toString(),
    timezone: company.timezone,
    breakMinutes: company.breakMinutes,
    shiftPremiumRate: Number(company.shiftPremiumRate) > 0 ? company.shiftPremiumRate.toString() : "",
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <div className="px-4 pt-12 pb-6 flex items-center justify-between border-b border-zinc-100">
        <div>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest">Company settings</p>
          <h1 className="text-2xl font-bold text-zinc-900 mt-0.5">{company.name}</h1>
        </div>
        <Link
          href={`/dashboard/${company.id}`}
          className="text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg active:bg-zinc-200 transition-colors"
        >
          ← Back
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-12 flex flex-col gap-8">
        {/* Pay schedule — read-only */}
        <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">Pay schedule</p>
          <p className="text-sm text-zinc-900 font-medium">Biweekly · anchored to {fmt(company.anchorPayday)}</p>
          <p className="text-xs text-zinc-400 mt-1">
            Pay schedule is locked. To change it, delete this company and create a new one.
          </p>
        </div>

        <CompanyForm initial={initial} companyId={company.id} redirectTo={`/dashboard/${company.id}`} />

        {/* Danger zone */}
        <div className="flex flex-col gap-3">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Danger zone</p>
          <DeleteCompanyButton companyId={company.id} />
        </div>
      </div>
    </div>
  );
}
