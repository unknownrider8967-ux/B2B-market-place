import { and, eq } from "drizzle-orm";
import { db, commissionRulesTable, companiesTable } from "@workspace/db";

const DEFAULT_COMMISSION_PCT = 10;

/**
 * Resolve the commission percentage that applies to a vendor company: the first active rule
 * matching the vendor's subtype, else the row flagged isDefault, else a hardcoded fallback.
 */
export async function getCommissionPercentage(vendorCompanyId: number): Promise<number> {
  const [company] = await db
    .select({ subtype: companiesTable.subtype })
    .from(companiesTable)
    .where(eq(companiesTable.id, vendorCompanyId))
    .limit(1);

  if (company?.subtype) {
    const [bySubtype] = await db
      .select({ percentage: commissionRulesTable.percentage })
      .from(commissionRulesTable)
      .where(
        and(
          eq(commissionRulesTable.vendorSubtype, company.subtype),
          eq(commissionRulesTable.isActive, true),
        ),
      )
      .limit(1);
    if (bySubtype) return Number(bySubtype.percentage);
  }

  const [byDefault] = await db
    .select({ percentage: commissionRulesTable.percentage })
    .from(commissionRulesTable)
    .where(and(eq(commissionRulesTable.isDefault, true), eq(commissionRulesTable.isActive, true)))
    .limit(1);
  if (byDefault) return Number(byDefault.percentage);

  return DEFAULT_COMMISSION_PCT;
}
