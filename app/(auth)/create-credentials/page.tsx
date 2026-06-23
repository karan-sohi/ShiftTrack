"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PinPad from "@/components/PinPad";

type Step = "username" | "pin" | "confirm";

export default function CreateCredentialsPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("username");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setError("3–20 chars, only letters, numbers, and underscores");
      return;
    }
    setStep("pin");
  }

  function handlePinComplete(val: string) {
    if (val.length === 6) {
      setPin(val);
      setConfirmPin("");
      setStep("confirm");
    }
  }

  async function handleConfirmComplete(val: string) {
    if (val.length < 6) return;
    if (val !== pin) {
      setError("PINs don't match. Try again.");
      setConfirmPin("");
      setStep("pin");
      setPin("");
      return;
    }
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/create-credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, pin }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setStep("username");
      return;
    }

    router.push("/");
  }

  return (
    <div className="flex flex-col gap-8">
      {step === "username" && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Choose a username</h1>
            <p className="mt-1 text-sm text-zinc-500">You'll use this to log in.</p>
          </div>

          <form onSubmit={handleUsernameSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="username"
              className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900
                         placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="h-12 rounded-xl bg-zinc-900 text-white font-medium text-sm active:bg-zinc-700"
            >
              Continue
            </button>
          </form>
        </>
      )}

      {step === "pin" && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Create a PIN</h1>
            <p className="mt-1 text-sm text-zinc-500">Enter a 6-digit PIN to secure your account.</p>
          </div>
          <PinPad value={pin} onChange={(v) => { setPin(v); handlePinComplete(v); }} />
        </>
      )}

      {step === "confirm" && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Confirm your PIN</h1>
            <p className="mt-1 text-sm text-zinc-500">Enter your PIN again to confirm.</p>
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <PinPad
            value={confirmPin}
            onChange={(v) => { setConfirmPin(v); handleConfirmComplete(v); }}
          />
          {loading && <p className="text-sm text-zinc-400 text-center">Setting up your account…</p>}
        </>
      )}
    </div>
  );
}
