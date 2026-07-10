import { eq } from "drizzle-orm";
import { db, userProfilesTable, companiesTable, type Company, type UserProfile } from "@workspace/db";

export async function getOrCreateProfile(userId: string): Promise<UserProfile> {
  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  if (existing) return existing;

  const [created] = await db
    .insert(userProfilesTable)
    .values({ userId, role: "buyer", companyId: null })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const [row] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));
  return row;
}

export async function getCompanyForProfile(profile: UserProfile): Promise<Company | null> {
  if (!profile.companyId) return null;
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, profile.companyId));
  return company ? serializeCompany(company) : null;
}

// Drizzle returns Postgres `numeric` columns as strings (to avoid float precision loss),
// but the generated Zod response schemas declare these fields as `number`. Any company row
// selected straight from the DB must go through this before being validated/serialized by a
// response schema, or `.parse()` throws on the non-null `outstandingBalance` column.
export function serializeCompany<T extends Record<string, unknown>>(company: T): T {
  const numericFields = ["minOrderValue", "freeShippingThreshold", "creditLimit", "outstandingBalance"] as const;
  const result: Record<string, unknown> = { ...company };
  for (const field of numericFields) {
    const value = result[field];
    if (value !== null && value !== undefined) {
      result[field] = Number(value);
    }
  }
  return result as T;
}
