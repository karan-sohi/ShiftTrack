"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteCompanyButton({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "deleting">("idle");

  async function handleDelete() {
    setStep("deleting");
    await fetch(`/api/companies/${companyId}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  if (step === "idle") {
    return (
      <button
        onClick={() => setStep("confirm")}
        className="w-full h-12 rounded-xl border border-red-200 text-red-600 text-sm font-semibold active:bg-red-50 transition-colors"
      >
        Delete company
      </button>
    );
  }

  if (step === "confirm") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-600 text-center">
          This will permanently delete the company and all its shifts. This cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          className="w-full h-12 rounded-xl bg-red-600 text-white text-sm font-semibold active:bg-red-700 transition-colors"
        >
          Yes, delete everything
        </button>
        <button
          onClick={() => setStep("idle")}
          className="w-full h-12 rounded-xl bg-zinc-100 text-zinc-700 text-sm font-semibold active:bg-zinc-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-sm text-zinc-500">
      Deleting…
    </div>
  );
}
