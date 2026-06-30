"use client";

import { useEffect } from "react";

export default function SetLastCompany({ companyId }: { companyId: string }) {
  useEffect(() => {
    document.cookie = `lastCompanyId=${companyId}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }, [companyId]);
  return null;
}
