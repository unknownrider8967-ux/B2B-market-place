import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, productSubstitutesTable, productsTable } from "@workspace/db";
import { insertProductSubstituteSchema } from "@workspace/db";
import { getOrCreateProfile } from "../lib/profile";
import { z } from "zod";

const router: IRouter = Router();

const ProductIdParams = z.object({ id: z.coerce.number().int().positive() });

// GET /products/:id/substitutes — public: list substitute suggestions for a product
router.get("/products/:id/substitutes", async (req: Request, res: Response): Promise<void> => {
  const params = ProductIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid product id" }); return; }

  const rows = await db
    .select({
      id: productSubstitutesTable.id,
      productId: productSubstitutesTable.productId,
      substituteProductId: productSubstitutesTable.substituteProductId,
      suggestedByVendorId: productSubstitutesTable.suggestedByVendorId,
      note: productSubstitutesTable.note,
      createdAt: productSubstitutesTable.createdAt,
      substituteName: productsTable.name,
      substituteDescription: productsTable.description,
    })
    .from(productSubstitutesTable)
    .innerJoin(productsTable, eq(productSubstitutesTable.substituteProductId, productsTable.id))
    .where(eq(productSubstitutesTable.productId, params.data.id));

  res.json(rows);
});

// POST /products/:id/substitutes — vendor suggests a substitute for a product
router.post("/products/:id/substitutes", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "vendor" || !profile.companyId) {
    res.status(403).json({ error: "Vendor company required" }); return;
  }

  const params = ProductIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid product id" }); return; }

  const parsed = insertProductSubstituteSchema.safeParse({ ...req.body, productId: params.data.id });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (parsed.data.productId === parsed.data.substituteProductId) {
    res.status(400).json({ error: "A product cannot be its own substitute" }); return;
  }

  // Verify substitute product exists
  const [sub] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.id, parsed.data.substituteProductId))
    .limit(1);
  if (!sub) { res.status(404).json({ error: "Substitute product not found" }); return; }

  const [created] = await db
    .insert(productSubstitutesTable)
    .values({ ...parsed.data, suggestedByVendorId: profile.companyId })
    .returning();

  res.status(201).json(created);
});

// DELETE /products/:id/substitutes/:subId — vendor removes their own suggestion
router.delete("/products/:id/substitutes/:subId", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "vendor" || !profile.companyId) {
    res.status(403).json({ error: "Vendor company required" }); return;
  }

  const subId = parseInt(req.params.subId, 10);
  if (isNaN(subId)) { res.status(400).json({ error: "Invalid substitute id" }); return; }

  const [existing] = await db
    .select()
    .from(productSubstitutesTable)
    .where(eq(productSubstitutesTable.id, subId))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.suggestedByVendorId !== profile.companyId) {
    res.status(403).json({ error: "Not your suggestion" }); return;
  }

  await db.delete(productSubstitutesTable).where(eq(productSubstitutesTable.id, subId));
  res.status(204).send();
});

export default router;
