import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, companiesTable } from "@workspace/db";
import { GetMyCompanyResponse } from "@workspace/api-zod";
import { getOrCreateProfile, getCompanyForProfile, serializeCompany } from "../lib/profile";
import { z } from "zod";

const router: IRouter = Router();

const UpdateMyCompanyBody = z.object({
  name: z.string().min(1).max(200).optional(),
  registrationNumber: z.string().max(100).optional().nullable(),
  taxInfo: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  contactEmail: z.string().email().max(200).optional().nullable(),
});

router.get("/companies/mine", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);
  // getCompanyForProfile already serializes numeric fields to numbers before returning.
  const company = await getCompanyForProfile(profile);
  res.json(GetMyCompanyResponse.parse(company));
});

router.patch("/companies/mine", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);
  if (!profile.companyId) {
    res.status(400).json({ error: "No company registered for this account" });
    return;
  }

  const parsed = UpdateMyCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) updateData[k] = v;
  }
  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(companiesTable)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(companiesTable.id, profile.companyId))
    .returning();

  res.json(serializeCompany(updated));
});

export default router;
