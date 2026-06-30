import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardRedirectPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const lastCompanyId = cookieStore.get("lastCompanyId")?.value;

  // Verify the cookie points to a valid, owned company
  if (lastCompanyId) {
    const company = await prisma.company.findUnique({ where: { id: lastCompanyId } });
    if (company && company.userId === session.userId) {
      redirect(`/dashboard/${lastCompanyId}`);
    }
  }

  // Cookie missing or stale — figure out what to do
  const companies = await prisma.company.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  if (companies.length === 0) redirect("/company/setup");
  if (companies.length === 1) redirect(`/dashboard/${companies[0].id}`);
  redirect("/companies");
}
