"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="w-full h-14 px-4 text-left text-sm font-medium text-red-600 disabled:opacity-50 active:bg-red-50 transition-colors"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
