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
  return company ?? null;
}
