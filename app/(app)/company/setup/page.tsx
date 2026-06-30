import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import CompanyForm from "@/components/CompanyForm";

export default async function CompanySetupPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <div className="px-4 pt-12 pb-6 flex items-center justify-between border-b border-zinc-100">
        <h1 className="text-2xl font-bold text-zinc-900">Add company</h1>
        <a href="/" className="text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg">
          ← Back
        </a>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-12">
        <CompanyForm />
      </div>
    </div>
  );
}
