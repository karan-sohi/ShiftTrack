import CompanyForm from "@/components/CompanyForm";

export default function CompanySetupPage() {
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
