import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  wishlistsTable,
  productsTable,
  categoriesTable,
  vendorOffersTable,
} from "@workspace/db";
import {
  ListWishlistResponse,
  AddToWishlistBody,
  AddToWishlistResponse,
  RemoveFromWishlistParams,
  RemoveFromWishlistResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/wishlist", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const rows = await db
    .select({
      id: wishlistsTable.id,
      userId: wishlistsTable.userId,
      productId: wishlistsTable.productId,
      createdAt: wishlistsTable.createdAt,
      productName: productsTable.name,
      productUnit: productsTable.unit,
      imageUrl: productsTable.imageUrl,
      categoryName: categoriesTable.name,
      offerCount: sql<number>`count(${vendorOffersTable.id})`,
      minPrice: sql<number | null>`min(${vendorOffersTable.price})`,
    })
    .from(wishlistsTable)
    .innerJoin(productsTable, eq(wishlistsTable.productId, productsTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .leftJoin(
      vendorOffersTable,
      and(eq(vendorOffersTable.productId, productsTable.id), eq(vendorOffersTable.status, "active")),
    )
    .where(eq(wishlistsTable.userId, req.user.id))
    .groupBy(
      wishlistsTable.id,
      wishlistsTable.userId,
      wishlistsTable.productId,
      wishlistsTable.createdAt,
      productsTable.name,
      productsTable.unit,
      productsTable.imageUrl,
      categoriesTable.name,
    )
    .orderBy(wishlistsTable.createdAt);

  res.json(
    ListWishlistResponse.parse(
      rows.map((r) => ({
        ...r,
        categoryName: r.categoryName ?? "Uncategorized",
        offerCount: Number(r.offerCount),
        minPrice: r.minPrice != null ? Number(r.minPrice) : null,
      })),
    ),
  );
});

router.post("/wishlist", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = AddToWishlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Upsert - ignore if already in wishlist
  const existing = await db
    .select()
    .from(wishlistsTable)
    .where(and(eq(wishlistsTable.userId, req.user.id), eq(wishlistsTable.productId, parsed.data.productId)))
    .limit(1);

  if (existing.length > 0) {
    res.status(201).json(AddToWishlistResponse.parse(existing[0]));
    return;
  }

  const [created] = await db
    .insert(wishlistsTable)
    .values({ userId: req.user.id, productId: parsed.data.productId })
    .returning();

  res.status(201).json(AddToWishlistResponse.parse(created));
});

router.delete("/wishlist/:productId", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const params = RemoveFromWishlistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(wishlistsTable)
    .where(and(eq(wishlistsTable.userId, req.user.id), eq(wishlistsTable.productId, params.data.productId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Wishlist item not found" });
    return;
  }

  res.json(RemoveFromWishlistResponse.parse({ success: true }));
});

export default router;
