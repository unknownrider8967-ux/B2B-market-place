import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, complianceCertificatesTable } from "@workspace/db";
import { insertComplianceCertificateSchema } from "@workspace/db";
import { getOrCreateProfile } from "../lib/profile";
import { z } from "zod";

const router: IRouter = Router();

const CertIdParams = z.object({ id: z.coerce.number().int().positive() });
const UpdateStatusBody = z.object({
  status: z.enum(["approved", "rejected", "expired"]),
  adminNote: z.string().max(2000).optional(),
});

// POST /compliance/certificates — vendor uploads a certificate
router.post("/compliance/certificates", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "vendor" || !profile.companyId) {
    res.status(403).json({ error: "Vendor company required" }); return;
  }

  const parsed = insertComplianceCertificateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [created] = await db
    .insert(complianceCertificatesTable)
    .values({ ...parsed.data, vendorCompanyId: profile.companyId, status: "pending" })
    .returning();

  res.status(201).json(created);
});

// GET /compliance/certificates/mine — vendor lists their certificates
router.get("/compliance/certificates/mine", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "vendor" || !profile.companyId) {
    res.status(403).json({ error: "Vendor company required" }); return;
  }

  const rows = await db
    .select()
    .from(complianceCertificatesTable)
    .where(eq(complianceCertificatesTable.vendorCompanyId, profile.companyId))
    .orderBy(desc(complianceCertificatesTable.createdAt));

  res.json(rows);
});

// GET /admin/compliance/certificates — admin lists all certificates (optionally filtered by status)
router.get("/admin/compliance/certificates", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const rows = await db
    .select()
    .from(complianceCertificatesTable)
    .orderBy(desc(complianceCertificatesTable.createdAt));

  res.json(rows);
});

// PATCH /compliance/certificates/:id/status — admin approves/rejects
router.patch("/compliance/certificates/:id/status", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const params = CertIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db
    .update(complianceCertificatesTable)
    .set({ status: parsed.data.status, adminNote: parsed.data.adminNote ?? null })
    .where(eq(complianceCertificatesTable.id, params.data.id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Certificate not found" }); return; }
  res.json(updated);
});

export default router;
