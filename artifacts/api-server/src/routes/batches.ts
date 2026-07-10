import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, lt, desc, sql } from "drizzle-orm";
import { db, productBatchesTable, vendorOffersTable, productsTable } from "@workspace/db";
import { insertProductBatchSchema } from "@workspace/db";
import { getOrCreateProfile } from "../lib/profile";
import { z } from "zod";

const router: IRouter = Router();

const OfferIdParams = z.object({ id: z.coerce.number().int().positive() });

// GET /offers/:id/batches — list batches for a specific offer
router.get("/offers/:id/batches", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const params = OfferIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid offer id" }); return; }

  const profile = await getOrCreateProfile(req.user.id);

  // Vendors can only see batches for their own offers
  if (profile.role === "vendor") {
    const [offer] = await db
      .select({ vendorCompanyId: vendorOffersTable.vendorCompanyId })
      .from(vendorOffersTable)
      .where(eq(vendorOffersTable.id, params.data.id))
      .limit(1);
    if (!offer || offer.vendorCompanyId !== profile.companyId) {
      res.status(403).json({ error: "Not your offer" }); return;
    }
  }

  const rows = await db
    .select()
    .from(productBatchesTable)
    .where(eq(productBatchesTable.vendorOfferId, params.data.id))
    .orderBy(productBatchesTable.expiryDate); // FEFO order

  res.json(rows);
});

// POST /offers/:id/batches — vendor adds a batch/lot to an offer
router.post("/offers/:id/batches", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "vendor" || !profile.companyId) {
    res.status(403).json({ error: "Vendor company required" }); return;
  }

  const params = OfferIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid offer id" }); return; }

  // Verify the offer belongs to this vendor
  const [offer] = await db
    .select({ vendorCompanyId: vendorOffersTable.vendorCompanyId })
    .from(vendorOffersTable)
    .where(eq(vendorOffersTable.id, params.data.id))
    .limit(1);
  if (!offer || offer.vendorCompanyId !== profile.companyId) {
    res.status(403).json({ error: "Not your offer" }); return;
  }

  const parsed = insertProductBatchSchema.safeParse({ ...req.body, vendorOfferId: params.data.id });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [created] = await db
    .insert(productBatchesTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(created);
});

// GET /vendor/batches/expiring — vendor sees near-expiry batches
router.get("/vendor/batches/expiring", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "vendor" || !profile.companyId) {
    res.status(403).json({ error: "Vendor company required" }); return;
  }

  // Default: batches expiring in the next 90 days
  const daysParam = parseInt(String(req.query.days ?? "90"), 10);
  const days = isNaN(daysParam) ? 90 : Math.min(daysParam, 365);
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: productBatchesTable.id,
      vendorOfferId: productBatchesTable.vendorOfferId,
      batchNumber: productBatchesTable.batchNumber,
      lotNumber: productBatchesTable.lotNumber,
      quantity: productBatchesTable.quantity,
      manufactureDate: productBatchesTable.manufactureDate,
      expiryDate: productBatchesTable.expiryDate,
      createdAt: productBatchesTable.createdAt,
      productName: productsTable.name,
    })
    .from(productBatchesTable)
    .innerJoin(vendorOffersTable, eq(productBatchesTable.vendorOfferId, vendorOffersTable.id))
    .innerJoin(productsTable, eq(vendorOffersTable.productId, productsTable.id))
    .where(
      and(
        eq(vendorOffersTable.vendorCompanyId, profile.companyId),
        lt(productBatchesTable.expiryDate, cutoff),
      ),
    )
    .orderBy(productBatchesTable.expiryDate);

  res.json(rows);
});

// GET /admin/batches/expiring — admin sees near-expiry across all vendors
router.get("/admin/batches/expiring", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const daysParam = parseInt(String(req.query.days ?? "90"), 10);
  const days = isNaN(daysParam) ? 90 : Math.min(daysParam, 365);
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: productBatchesTable.id,
      vendorOfferId: productBatchesTable.vendorOfferId,
      batchNumber: productBatchesTable.batchNumber,
      lotNumber: productBatchesTable.lotNumber,
      quantity: productBatchesTable.quantity,
      expiryDate: productBatchesTable.expiryDate,
      productName: productsTable.name,
    })
    .from(productBatchesTable)
    .innerJoin(vendorOffersTable, eq(productBatchesTable.vendorOfferId, vendorOffersTable.id))
    .innerJoin(productsTable, eq(vendorOffersTable.productId, productsTable.id))
    .where(lt(productBatchesTable.expiryDate, cutoff))
    .orderBy(productBatchesTable.expiryDate);

  res.json(rows);
});

export default router;
