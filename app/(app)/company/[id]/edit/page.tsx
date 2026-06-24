import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CompanyForm from "@/components/CompanyForm";
import type { CompanyFormData } from "@/components/CompanyForm";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company || company.userId !== session!.userId) notFound();

  const initial: Partial<CompanyFormData> = {
    name: company.name,
    startTime: company.startTime,
    endTime: company.endTime,
    workdays: company.workdays,
    hourlyRate: company.hourlyRate.toString(),
    overtimeRule: company.overtimeRule as CompanyFormData["overtimeRule"],
    overtimeMultiplier: company.overtimeMultiplier.toString(),
    anchorPayday: company.anchorPayday.toISOString().split("T")[0],
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-12 pb-6">
        <h1 className="text-xl font-bold text-zinc-900">Edit company</h1>
        <span className="text-zinc-400 text-sm">{company.name}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <CompanyForm initial={initial} companyId={company.id} redirectTo="/" />
      </div>
    </div>
  );
}
