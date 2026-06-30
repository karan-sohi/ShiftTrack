import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function CompaniesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const companies = await prisma.company.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  if (companies.length === 0) redirect("/company/setup");
  if (companies.length === 1) redirect(`/dashboard/${companies[0].id}`);

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      <div className="px-4 pt-12 pb-6 border-b border-zinc-100">
        <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest">ShiftTrack</p>
        <h1 className="text-2xl font-bold text-zinc-900 mt-0.5">Your companies</h1>
      </div>

      <section className="px-4 mt-6">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">
          Select a company
        </p>
        <div className="flex flex-col gap-2">
          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/dashboard/${company.id}`}
              className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex items-center justify-between active:bg-zinc-50 transition-colors"
            >
              <div>
                <p className="font-semibold text-zinc-900">{company.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {Number(company.hourlyRate).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}/hr
                </p>
              </div>
              <span className="text-zinc-400 text-lg">›</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 mt-6">
        <Link
          href="/company/setup"
          className="flex items-center justify-center h-12 rounded-xl border-2 border-dashed border-zinc-200 text-sm font-semibold text-zinc-500 active:bg-zinc-50 transition-colors"
        >
          + Add another company
        </Link>
      </section>
    </div>
  );
}
