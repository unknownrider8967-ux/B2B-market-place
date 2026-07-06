import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, ilike, sql } from "drizzle-orm";
import { db, productsTable, categoriesTable, vendorOffersTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  ListProductsResponse,
  CreateProductBody,
  CreateProductResponse,
  GetProductParams,
  GetProductResponse,
} from "@workspace/api-zod";

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

export default router;
