import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, ilike, sql } from "drizzle-orm";
import { db, productsTable, categoriesTable, vendorOffersTable, wishlistsTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  ListProductsResponse,
  CreateProductBody,
  CreateProductResponse,
  GetProductParams,
  GetProductResponse,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
  DeleteProductResponse,
} from "@workspace/api-zod";
import { getOrCreateProfile } from "../lib/profile";

const router: IRouter = Router();

router.get("/products", async (req: Request, res: Response): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.categoryId) conditions.push(eq(productsTable.categoryId, query.data.categoryId));
  if (query.data.search) conditions.push(ilike(productsTable.name, `%${query.data.search}%`));

  const rows = await db
    .select({
      id: productsTable.id,
      categoryId: productsTable.categoryId,
      name: productsTable.name,
      description: productsTable.description,
      unit: productsTable.unit,
      imageUrl: productsTable.imageUrl,
      createdAt: productsTable.createdAt,
      categoryName: categoriesTable.name,
      offerCount: sql<number>`count(${vendorOffersTable.id})`,
      minPrice: sql<number | null>`min(${vendorOffersTable.price})`,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .leftJoin(
      vendorOffersTable,
      and(eq(vendorOffersTable.productId, productsTable.id), eq(vendorOffersTable.status, "active")),
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(productsTable.id, categoriesTable.name)
    .orderBy(productsTable.name);

  res.json(
    ListProductsResponse.parse(
      rows.map((r) => ({
        ...r,
        categoryName: r.categoryName ?? "Uncategorized",
        offerCount: Number(r.offerCount),
        minPrice: r.minPrice != null ? Number(r.minPrice) : null,
      })),
    ),
  );
});

router.post("/products", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const creatorProfile = await getOrCreateProfile(req.user.id);
  if (creatorProfile.role !== "admin" && creatorProfile.role !== "vendor") {
    res.status(403).json({ error: "Admin or vendor access required" });
    return;
  }
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db.insert(productsTable).values(parsed.data).returning();
  res.status(201).json(CreateProductResponse.parse(created));
});

router.get("/products/:id", async (req: Request, res: Response): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(GetProductResponse.parse(product));
});

router.patch("/products/:id", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const params = UpdateProductParams.safeParse(req.params);
  const body = UpdateProductBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }

  const [updated] = await db
    .update(productsTable)
    .set(body.data)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(UpdateProductResponse.parse(updated));
});

router.delete("/products/:id", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Cascade-delete dependent rows in a transaction so the product table
  // is never left with orphaned offers or wishlist entries.
  const result = await db.transaction(async (tx) => {
    const [product] = await tx
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.id, params.data.id))
      .limit(1);

    if (!product) return null;

    // 1. Remove wishlist entries referencing this product
    await tx.delete(wishlistsTable).where(eq(wishlistsTable.productId, params.data.id));

    // 2. Remove vendor offers referencing this product
    await tx.delete(vendorOffersTable).where(eq(vendorOffersTable.productId, params.data.id));

    // 3. Delete the product itself
    const [deleted] = await tx
      .delete(productsTable)
      .where(eq(productsTable.id, params.data.id))
      .returning();

    return deleted;
  });

  if (!result) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(DeleteProductResponse.parse({ success: true }));
});

export default router;
