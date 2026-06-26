"use client";

import { useState } from "react";

const CA_PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

type Props = {
  initial: { country: string; region: string } | null;
};

type Status = "idle" | "saving" | "saved" | "removing";

export default function TaxProfileForm({ initial }: Props) {
  const [country, setCountry] = useState(initial?.country ?? "");
  const [region,  setRegion]  = useState(initial?.region  ?? "");
  const [status,  setStatus]  = useState<Status>("idle");

  const canSave = country === "CA" ? Boolean(region) : Boolean(country);

  async function handleSave() {
    if (!canSave) return;
    setStatus("saving");
    await fetch("/api/tax-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, region: country === "CA" ? region : "" }),
    });
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  async function handleRemove() {
    setStatus("removing");
    await fetch("/api/tax-profile", { method: "DELETE" });
    setCountry("");
    setRegion("");
    setStatus("idle");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Country */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Country</label>
        <select
          value={country}
          onChange={(e) => { setCountry(e.target.value); setRegion(""); }}
          className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900
                     focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">Not set</option>
          <option value="CA">Canada</option>
          <option value="OTHER">Other country</option>
        </select>
      </div>

      {/* Province — only for Canada */}
      {country === "CA" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Province / Territory</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900
                       focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            <option value="">Select province</option>
            {CA_PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Note for unsupported countries */}
      {country === "OTHER" && (
        <p className="text-xs text-zinc-400 bg-zinc-50 rounded-xl px-4 py-3">
          Tax calculation isn't available for your country yet — your payday summary will show gross pay only.
          We'll add more countries soon.
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={!canSave || status === "saving"}
        className="h-12 rounded-xl bg-zinc-900 text-white font-semibold text-sm shadow-sm
                   disabled:opacity-50 active:bg-zinc-700 transition-colors"
      >
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save tax settings"}
      </button>

      {initial && (
        <button
          onClick={handleRemove}
          disabled={status === "removing"}
          className="text-sm text-zinc-400 text-center disabled:opacity-50"
        >
          {status === "removing" ? "Removing…" : "Remove tax settings"}
        </button>
      )}
    </div>
  );
}
