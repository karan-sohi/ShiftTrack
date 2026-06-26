import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  const company = await prisma.company.findFirst({ where: { userId: session.userId }, orderBy: { createdAt: "desc" } });
  if (!company) redirect("/company/setup");

  redirect("/dashboard");
}
