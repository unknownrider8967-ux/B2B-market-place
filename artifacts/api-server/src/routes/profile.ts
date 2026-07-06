import { Router, type IRouter, type Request, type Response } from "express";
import { db, companiesTable, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetMyProfileResponse, OnboardMyProfileBody, OnboardMyProfileResponse } from "@workspace/api-zod";
import { getOrCreateProfile, getCompanyForProfile } from "../lib/profile";

const router: IRouter = Router();

router.get("/me", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);
  const company = await getCompanyForProfile(profile);
  res.json(
    GetMyProfileResponse.parse({
      userId: profile.userId,
      role: profile.role,
      companyId: profile.companyId,
      company,
      user: req.user,
    }),
  );
});

router.post("/me/onboard", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = OnboardMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { role, company } = parsed.data;
  const userId = req.user.id;

  const [createdCompany] = await db
    .insert(companiesTable)
    .values({
      ...company,
      ownerUserId: userId,
      status: role === "buyer" ? "approved" : "pending",
    })
    .returning();

  await db
    .insert(userProfilesTable)
    .values({ userId, role, companyId: createdCompany.id })
    .onConflictDoUpdate({
      target: userProfilesTable.userId,
      set: { role, companyId: createdCompany.id, updatedAt: new Date() },
    });

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  res.json(
    OnboardMyProfileResponse.parse({
      userId: profile.userId,
      role: profile.role,
      companyId: profile.companyId,
      company: createdCompany,
      user: req.user,
    }),
  );
});

export default router;
