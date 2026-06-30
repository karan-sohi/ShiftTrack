import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  const companies = await prisma.company.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  if (companies.length === 0) redirect("/company/setup");
  if (companies.length === 1) redirect(`/dashboard/${companies[0].id}`);
  redirect("/companies");
}
