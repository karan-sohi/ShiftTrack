export { calculateCanadaPeriodTax, getCanadaProvinces } from "./canada";
export type { TaxBreakdown } from "./canada";

export function periodsPerYear(payFrequency: string): number {
  switch (payFrequency) {
    case "weekly":       return 52;
    case "semimonthly":  return 24;
    case "monthly":      return 12;
    default:             return 26; // biweekly
  }
}

export const SUPPORTED_COUNTRIES = [
  { code: "CA", name: "Canada" },
] as const;
