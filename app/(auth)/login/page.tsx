"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PinPad from "@/components/PinPad";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"username" | "pin">("username");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setError("");
    setStep("pin");
  }

  async function handlePinChange(val: string) {
    setPin(val);
    if (val.length < 6) return;

    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, pin: val }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setPin("");
      if (data.locked) {
        setError(data.error);
        setStep("username");
      } else {
        setError(data.error ?? "Invalid PIN");
      }
      return;
    }

    router.push("/");
  }

  return (
    <div className="flex flex-col gap-8">
      {step === "username" && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Welcome back</h1>
            <p className="mt-1 text-sm text-zinc-500">Enter your username to continue.</p>
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
            {error && (
              <div className="text-sm text-red-600">
                <p>{error}</p>
                {error.includes("locked") && (
                  <Link href="/signup" className="underline underline-offset-2 mt-1 inline-block">
                    Re-verify your email to unlock
                  </Link>
                )}
              </div>
            )}
            <button
              type="submit"
              className="h-12 rounded-xl bg-zinc-900 text-white font-medium text-sm active:bg-zinc-700"
            >
              Continue
            </button>
          </form>

          <p className="text-sm text-center text-zinc-500">
            No account?{" "}
            <Link href="/signup" className="font-medium text-zinc-900 underline underline-offset-2">
              Sign up
            </Link>
          </p>
        </>
      )}

      {step === "pin" && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Enter PIN</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Logging in as <span className="font-medium text-zinc-700">{username}</span>
            </p>
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <PinPad value={pin} onChange={handlePinChange} />

          {loading && <p className="text-sm text-zinc-400 text-center">Checking…</p>}

          <button
            type="button"
            onClick={() => { setStep("username"); setPin(""); setError(""); }}
            className="text-sm text-zinc-500 underline underline-offset-2 text-center"
          >
            Use a different username
          </button>
        </>
      )}
    </div>
  );
}
