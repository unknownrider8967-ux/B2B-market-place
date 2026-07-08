import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, sql, ne } from "drizzle-orm";
import {
  db,
  reviewsTable,
  usersTable,
  vendorOffersTable,
  orderItemsTable,
  ordersTable,
  companiesTable,
} from "@workspace/db";
import { getOrCreateProfile } from "../lib/profile";
import { z } from "zod";

const router: IRouter = Router();

const CreateReviewBody = z.object({
  productId: z.number().int().positive(),
  vendorCompanyId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

const GetProductReviewsParams = z.object({ id: z.coerce.number().int().positive() });

// GET /products/:id/reviews — public, paginated list of reviews for a product
router.get("/products/:id/reviews", async (req: Request, res: Response): Promise<void> => {
  const params = GetProductReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: reviewsTable.id,
      userId: reviewsTable.userId,
      productId: reviewsTable.productId,
      vendorCompanyId: reviewsTable.vendorCompanyId,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      createdAt: reviewsTable.createdAt,
      vendorName: companiesTable.name,
      reviewerName: sql<string>`coalesce(${usersTable.firstName} || ' ' || ${usersTable.lastName}, 'Anonymous')`,
    })
    .from(reviewsTable)
    .innerJoin(companiesTable, eq(reviewsTable.vendorCompanyId, companiesTable.id))
    .innerJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .where(eq(reviewsTable.productId, params.data.id))
    .orderBy(sql`${reviewsTable.createdAt} desc`);

  // Aggregate per-vendor averages
  const vendorStats = await db
    .select({
      vendorCompanyId: reviewsTable.vendorCompanyId,
      avgRating: sql<number>`round(avg(${reviewsTable.rating})::numeric, 1)`,
      reviewCount: sql<number>`count(*)`,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.productId, params.data.id))
    .groupBy(reviewsTable.vendorCompanyId);

  const overallAvg =
    rows.length > 0
      ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10
      : null;

  res.json({ reviews: rows, vendorStats, overallAvg, totalCount: rows.length });
});

// POST /reviews — buyer submits a review (must have purchased from this vendor)
router.post("/reviews", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "buyer") {
    res.status(403).json({ error: "Only buyers can submit reviews" });
    return;
  }

  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { productId, vendorCompanyId, rating, comment } = parsed.data;

  // Verify the buyer has actually purchased from this vendor
  const [purchase] = await db
    .select({ id: orderItemsTable.id })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .innerJoin(vendorOffersTable, eq(orderItemsTable.offerId, vendorOffersTable.id))
    .where(
      and(
        eq(ordersTable.buyerUserId, req.user.id),
        eq(orderItemsTable.productId, productId),
        eq(orderItemsTable.vendorCompanyId, vendorCompanyId),
      ),
    )
    .limit(1);

  if (!purchase) {
    res.status(403).json({ error: "You can only review vendors you have purchased from" });
    return;
  }

  // Prevent duplicate reviews for the same product+vendor
  const [existing] = await db
    .select({ id: reviewsTable.id })
    .from(reviewsTable)
    .where(
      and(
        eq(reviewsTable.userId, req.user.id),
        eq(reviewsTable.productId, productId),
        eq(reviewsTable.vendorCompanyId, vendorCompanyId),
      ),
    )
    .limit(1);

  if (existing) {
    // Update existing review
    const [updated] = await db
      .update(reviewsTable)
      .set({ rating, comment: comment ?? null })
      .where(eq(reviewsTable.id, existing.id))
      .returning();
    res.json(updated);
    return;
  }

  const [created] = await db
    .insert(reviewsTable)
    .values({ userId: req.user.id, productId, vendorCompanyId, rating, comment: comment ?? null })
    .returning();

  res.status(201).json(created);
});

// GET /reviews/mine — buyer sees their own reviews
router.get("/reviews/mine", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const rows = await db
    .select({
      id: reviewsTable.id,
      productId: reviewsTable.productId,
      vendorCompanyId: reviewsTable.vendorCompanyId,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      createdAt: reviewsTable.createdAt,
      vendorName: companiesTable.name,
    })
    .from(reviewsTable)
    .innerJoin(companiesTable, eq(reviewsTable.vendorCompanyId, companiesTable.id))
    .where(eq(reviewsTable.userId, req.user.id))
    .orderBy(sql`${reviewsTable.createdAt} desc`);

  res.json(rows);
});

export default router;
