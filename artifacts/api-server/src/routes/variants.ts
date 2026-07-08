import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, productVariantsTable } from "@workspace/db";
import {
  ListProductVariantsParams,
  ListProductVariantsResponse,
  CreateProductVariantParams,
  CreateProductVariantBody,
  CreateProductVariantResponse,
  DeleteProductVariantParams,
} from "@workspace/api-zod";
import { getOrCreateProfile } from "../lib/profile";

const router: IRouter = Router();

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

router.get("/products/:id/variants", async (req: Request, res: Response): Promise<void> => {
  const params = ListProductVariantsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(productVariantsTable)
    .where(eq(productVariantsTable.productId, params.data.id))
    .orderBy(productVariantsTable.createdAt);

  res.json(ListProductVariantsResponse.parse(rows));
});

router.post("/admin/products/:id/variants", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = CreateProductVariantParams.safeParse(req.params);
  const body = CreateProductVariantBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }

  const [created] = await db
    .insert(productVariantsTable)
    .values({
      productId: params.data.id,
      name: body.data.name,
      sku: body.data.sku ?? null,
    })
    .returning();

  res.status(201).json(CreateProductVariantResponse.parse(created));
});

router.delete("/admin/variants/:id", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = DeleteProductVariantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(productVariantsTable)
    .where(eq(productVariantsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Variant not found" });
    return;
  }

  res.status(204).send();
});

export default router;
