// 2025 Canadian federal + provincial tax rates.
// Update this file each January when CRA publishes new indexed amounts.

type Bracket = { over: number; upto: number; rate: number };

function applyBrackets(income: number, brackets: Bracket[]): number {
  let tax = 0;
  for (const b of brackets) {
    if (income <= b.over) break;
    tax += (Math.min(income, b.upto) - b.over) * b.rate;
  }
  return Math.max(0, tax);
}

// ── Federal 2025 ─────────────────────────────────────────────
const FED_BPA = 16_129;
const FED_BRACKETS: Bracket[] = [
  { over: 0,       upto: 57_375,   rate: 0.15   },
  { over: 57_375,  upto: 114_750,  rate: 0.205  },
  { over: 114_750, upto: 158_519,  rate: 0.26   },
  { over: 158_519, upto: 220_000,  rate: 0.29   },
  { over: 220_000, upto: Infinity, rate: 0.33   },
];

// ── CPP 2025 ─────────────────────────────────────────────────
const CPP_RATE       = 0.0595;
const CPP_EXEMPTION  = 3_500;
const CPP_YMPE       = 71_300;

// ── QPP 2025 (Quebec replaces CPP) ──────────────────────────
const QPP_RATE       = 0.064;

// ── EI 2025 ──────────────────────────────────────────────────
const EI_RATE             = 0.0164;
const EI_QC_RATE          = 0.0131; // Quebec workers pay less EI (separate QPIP)
const EI_MAX_INSURABLE    = 65_700;

// ── Province configs ─────────────────────────────────────────
type ProvinceConfig = {
  name: string;
  bpa: number;
  lowestRate: number;
  brackets: Bracket[];
  usesQPP?: boolean;
  ontarioSurtax?: boolean;
};

const PROVINCE_CONFIGS: Record<string, ProvinceConfig> = {
  BC: {
    name: "British Columbia",
    bpa: 11_981, lowestRate: 0.0506,
    brackets: [
      { over: 0,       upto: 45_654,   rate: 0.0506 },
      { over: 45_654,  upto: 91_310,   rate: 0.077  },
      { over: 91_310,  upto: 104_835,  rate: 0.105  },
      { over: 104_835, upto: 127_299,  rate: 0.1229 },
      { over: 127_299, upto: 172_602,  rate: 0.147  },
      { over: 172_602, upto: 240_716,  rate: 0.168  },
      { over: 240_716, upto: Infinity, rate: 0.205  },
    ],
  },
  AB: {
    name: "Alberta",
    bpa: 21_003, lowestRate: 0.10,
    brackets: [
      { over: 0,       upto: 148_269,  rate: 0.10 },
      { over: 148_269, upto: 177_922,  rate: 0.12 },
      { over: 177_922, upto: 237_230,  rate: 0.13 },
      { over: 237_230, upto: 355_845,  rate: 0.14 },
      { over: 355_845, upto: Infinity, rate: 0.15 },
    ],
  },
  ON: {
    name: "Ontario",
    bpa: 11_865, lowestRate: 0.0505, ontarioSurtax: true,
    brackets: [
      { over: 0,       upto: 51_446,   rate: 0.0505 },
      { over: 51_446,  upto: 102_894,  rate: 0.0915 },
      { over: 102_894, upto: 150_000,  rate: 0.1116 },
      { over: 150_000, upto: 220_000,  rate: 0.1216 },
      { over: 220_000, upto: Infinity, rate: 0.1316 },
    ],
  },
  QC: {
    name: "Quebec",
    bpa: 17_183, lowestRate: 0.14, usesQPP: true,
    brackets: [
      { over: 0,       upto: 51_780,   rate: 0.14   },
      { over: 51_780,  upto: 103_545,  rate: 0.19   },
      { over: 103_545, upto: 126_000,  rate: 0.24   },
      { over: 126_000, upto: Infinity, rate: 0.2575 },
    ],
  },
  MB: {
    name: "Manitoba",
    bpa: 15_780, lowestRate: 0.108,
    brackets: [
      { over: 0,       upto: 47_000,   rate: 0.108  },
      { over: 47_000,  upto: 100_000,  rate: 0.1275 },
      { over: 100_000, upto: Infinity, rate: 0.174  },
    ],
  },
  SK: {
    name: "Saskatchewan",
    bpa: 17_661, lowestRate: 0.105,
    brackets: [
      { over: 0,       upto: 49_720,   rate: 0.105  },
      { over: 49_720,  upto: 142_058,  rate: 0.125  },
      { over: 142_058, upto: Infinity, rate: 0.145  },
    ],
  },
  NS: {
    name: "Nova Scotia",
    bpa: 8_481, lowestRate: 0.0879,
    brackets: [
      { over: 0,       upto: 29_590,   rate: 0.0879 },
      { over: 29_590,  upto: 59_180,   rate: 0.1495 },
      { over: 59_180,  upto: 93_000,   rate: 0.1667 },
      { over: 93_000,  upto: 150_000,  rate: 0.175  },
      { over: 150_000, upto: Infinity, rate: 0.21   },
    ],
  },
  NB: {
    name: "New Brunswick",
    bpa: 12_458, lowestRate: 0.094,
    brackets: [
      { over: 0,       upto: 47_715,   rate: 0.094  },
      { over: 47_715,  upto: 95_431,   rate: 0.1482 },
      { over: 95_431,  upto: 176_756,  rate: 0.1652 },
      { over: 176_756, upto: Infinity, rate: 0.195  },
    ],
  },
  PE: {
    name: "Prince Edward Island",
    bpa: 12_000, lowestRate: 0.0965,
    brackets: [
      { over: 0,       upto: 32_656,   rate: 0.0965 },
      { over: 32_656,  upto: 64_313,   rate: 0.1363 },
      { over: 64_313,  upto: 105_000,  rate: 0.1665 },
      { over: 105_000, upto: 140_000,  rate: 0.18   },
      { over: 140_000, upto: Infinity, rate: 0.1875 },
    ],
  },
  NL: {
    name: "Newfoundland and Labrador",
    bpa: 10_818, lowestRate: 0.087,
    brackets: [
      { over: 0,       upto: 43_198,   rate: 0.087  },
      { over: 43_198,  upto: 86_395,   rate: 0.145  },
      { over: 86_395,  upto: 154_244,  rate: 0.158  },
      { over: 154_244, upto: 215_943,  rate: 0.178  },
      { over: 215_943, upto: 275_870,  rate: 0.198  },
      { over: 275_870, upto: 551_739,  rate: 0.208  },
      { over: 551_739, upto: Infinity, rate: 0.213  },
    ],
  },
  NT: {
    name: "Northwest Territories",
    bpa: 16_593, lowestRate: 0.059,
    brackets: [
      { over: 0,       upto: 50_597,   rate: 0.059  },
      { over: 50_597,  upto: 101_198,  rate: 0.086  },
      { over: 101_198, upto: 164_525,  rate: 0.122  },
      { over: 164_525, upto: Infinity, rate: 0.1405 },
    ],
  },
  NU: {
    name: "Nunavut",
    bpa: 17_925, lowestRate: 0.04,
    brackets: [
      { over: 0,       upto: 53_268,   rate: 0.04  },
      { over: 53_268,  upto: 106_537,  rate: 0.07  },
      { over: 106_537, upto: 173_205,  rate: 0.09  },
      { over: 173_205, upto: Infinity, rate: 0.115 },
    ],
  },
  YT: {
    name: "Yukon",
    bpa: 16_129, lowestRate: 0.064,
    brackets: [
      { over: 0,       upto: 57_375,   rate: 0.064 },
      { over: 57_375,  upto: 114_750,  rate: 0.09  },
      { over: 114_750, upto: 158_519,  rate: 0.109 },
      { over: 158_519, upto: 500_000,  rate: 0.128 },
      { over: 500_000, upto: Infinity, rate: 0.15  },
    ],
  },
};

export function getCanadaProvinces() {
  return Object.entries(PROVINCE_CONFIGS)
    .map(([code, c]) => ({ code, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type TaxBreakdown = {
  federalTax:    number;
  provincialTax: number;
  cpp:           number; // or QPP for QC
  ei:            number;
  totalDeductions: number;
  netPay:        number;
  provinceName:  string;
  taxYear:       number;
};

export function calculateCanadaPeriodTax(
  grossPay: number,
  periodsPerYear: number,
  province: string,
): TaxBreakdown | null {
  const config = PROVINCE_CONFIGS[province];
  if (!config) return null;

  const annual = grossPay * periodsPerYear;

  // Federal income tax
  let fedTaxAnnual = applyBrackets(annual, FED_BRACKETS) - FED_BPA * 0.15;
  fedTaxAnnual = Math.max(0, fedTaxAnnual);
  if (config.usesQPP) fedTaxAnnual *= 1 - 0.165; // Quebec abatement

  // Provincial income tax
  let provTaxAnnual = applyBrackets(annual, config.brackets) - config.bpa * config.lowestRate;
  provTaxAnnual = Math.max(0, provTaxAnnual);
  if (config.ontarioSurtax) {
    let surtax = 0;
    if (provTaxAnnual > 5_315) surtax += (provTaxAnnual - 5_315) * 0.20;
    if (provTaxAnnual > 6_802) surtax += (provTaxAnnual - 6_802) * 0.36;
    provTaxAnnual += surtax;
  }

  // CPP or QPP
  const pensionRate = config.usesQPP ? QPP_RATE : CPP_RATE;
  const pensionEligible = Math.max(0, Math.min(annual, CPP_YMPE) - CPP_EXEMPTION);
  const pensionAnnual = pensionEligible * pensionRate;

  // EI
  const eiRate = config.usesQPP ? EI_QC_RATE : EI_RATE;
  const eiAnnual = Math.min(annual, EI_MAX_INSURABLE) * eiRate;

  const fedTax    = fedTaxAnnual    / periodsPerYear;
  const provTax   = provTaxAnnual   / periodsPerYear;
  const cpp       = pensionAnnual   / periodsPerYear;
  const ei        = eiAnnual        / periodsPerYear;
  const totalDeductions = fedTax + provTax + cpp + ei;

  return {
    federalTax:      fedTax,
    provincialTax:   provTax,
    cpp,
    ei,
    totalDeductions,
    netPay: grossPay - totalDeductions,
    provinceName: config.name,
    taxYear: 2025,
  };
}
