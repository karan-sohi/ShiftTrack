import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CompanyForm from "@/components/CompanyForm";

export default async function CompanySetupPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const existing = await prisma.company.findFirst({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  if (existing) redirect(`/company/${existing.id}/edit`);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-12 pb-6">
        <h1 className="text-xl font-bold text-zinc-900">Add company</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <CompanyForm redirectTo="/" />
      </div>
    </div>
  );
}
