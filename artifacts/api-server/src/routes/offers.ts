import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, sql, ne, lt } from "drizzle-orm";
import { db, vendorOffersTable, productsTable, companiesTable, orderItemsTable, rfqsTable, ordersTable, userProfilesTable } from "@workspace/db";
import {
  ListProductOffersParams,
  ListProductOffersResponse,
  CreateOfferBody,
  CreateOfferResponse,
  ListMyOffersResponse,
  UpdateOfferParams,
  UpdateOfferBody,
  UpdateOfferResponse,
  DeleteOfferParams,
  DeleteOfferResponse,
  GetVendorDashboardResponse,
  BulkUploadOffersBody,
  BulkUploadOffersResponse,
} from "@workspace/api-zod";
import { getOrCreateProfile } from "../lib/profile";
import { createNotification } from "../lib/notifications";

const router: IRouter = Router();

router.get("/products/:id/offers", async (req: Request, res: Response): Promise<void> => {
  const params = ListProductOffersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: vendorOffersTable.id,
      productId: vendorOffersTable.productId,
      vendorCompanyId: vendorOffersTable.vendorCompanyId,
      price: vendorOffersTable.price,
      moq: vendorOffersTable.moq,
      stock: vendorOffersTable.stock,
      deliveryDays: vendorOffersTable.deliveryDays,
      priceTiers: vendorOffersTable.priceTiers,
      status: vendorOffersTable.status,
      createdAt: vendorOffersTable.createdAt,
      vendorName: companiesTable.name,
      vendorSubtype: companiesTable.subtype,
    })
    .from(vendorOffersTable)
    .innerJoin(companiesTable, eq(vendorOffersTable.vendorCompanyId, companiesTable.id))
    .where(and(eq(vendorOffersTable.productId, params.data.id), eq(vendorOffersTable.status, "active")))
    .orderBy(vendorOffersTable.price);

  res.json(ListProductOffersResponse.parse(rows));
});

async function requireVendorCompany(req: Request, res: Response): Promise<number | null> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "vendor" || !profile.companyId) {
    res.status(403).json({ error: "Vendor company required" });
    return null;
  }
  return profile.companyId;
}

router.post("/offers", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const parsed = CreateOfferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [created] = await db
    .insert(vendorOffersTable)
    .values({
      ...parsed.data,
      vendorCompanyId,
      price: parsed.data.price.toFixed(2),
      priceTiers: parsed.data.priceTiers.map((t) => ({ ...t, price: t.price })),
    })
    .returning();

  // Fire-and-forget: competition alert for other vendors with higher price on same product
  (async () => {
    try {
      const newPrice = parsed.data.price;
      const productId = parsed.data.productId;
      const [product] = await db
        .select({ name: productsTable.name })
        .from(productsTable)
        .where(eq(productsTable.id, productId))
        .limit(1);
      const productName = product?.name ?? `Product #${productId}`;

      const competingOffers = await db
        .select({
          vendorCompanyId: vendorOffersTable.vendorCompanyId,
          ownerId: companiesTable.ownerUserId,
        })
        .from(vendorOffersTable)
        .innerJoin(companiesTable, eq(vendorOffersTable.vendorCompanyId, companiesTable.id))
        .where(
          and(
            eq(vendorOffersTable.productId, productId),
            eq(vendorOffersTable.status, "active"),
            ne(vendorOffersTable.vendorCompanyId, vendorCompanyId),
          ),
        );

      for (const competitor of competingOffers) {
        if (competitor.ownerId) {
          await createNotification({
            userId: competitor.ownerId,
            type: "price_undercut",
            title: "A competitor undercut your price",
            message: `A competitor just listed ${productName} at ${newPrice.toFixed(2)}. Review your pricing to stay competitive.`,
            relatedId: productId,
          });
        }
      }
    } catch {
      // Non-critical alerts
    }
  })();

  res.status(201).json(CreateOfferResponse.parse(created));
});

router.get("/offers/mine", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const rows = await db
    .select({
      id: vendorOffersTable.id,
      productId: vendorOffersTable.productId,
      vendorCompanyId: vendorOffersTable.vendorCompanyId,
      price: vendorOffersTable.price,
      moq: vendorOffersTable.moq,
      stock: vendorOffersTable.stock,
      deliveryDays: vendorOffersTable.deliveryDays,
      priceTiers: vendorOffersTable.priceTiers,
      status: vendorOffersTable.status,
      createdAt: vendorOffersTable.createdAt,
      productName: productsTable.name,
      productUnit: productsTable.unit,
    })
    .from(vendorOffersTable)
    .innerJoin(productsTable, eq(vendorOffersTable.productId, productsTable.id))
    .where(eq(vendorOffersTable.vendorCompanyId, vendorCompanyId))
    .orderBy(vendorOffersTable.createdAt);

  res.json(ListMyOffersResponse.parse(rows));
});

const LOW_STOCK_THRESHOLD = 10;

router.patch("/offers/:id", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const params = UpdateOfferParams.safeParse(req.params);
  const body = UpdateOfferBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }

  // Fetch the current offer before updating (to compare prices and detect changes)
  const [currentOffer] = await db
    .select()
    .from(vendorOffersTable)
    .where(and(eq(vendorOffersTable.id, params.data.id), eq(vendorOffersTable.vendorCompanyId, vendorCompanyId)))
    .limit(1);

  if (!currentOffer) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }

  const { price, ...rest } = body.data;
  const [updated] = await db
    .update(vendorOffersTable)
    .set({ ...rest, ...(price !== undefined ? { price: price.toFixed(2) } : {}), updatedAt: new Date() })
    .where(and(eq(vendorOffersTable.id, params.data.id), eq(vendorOffersTable.vendorCompanyId, vendorCompanyId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }

  // Fire-and-forget alerts
  (async () => {
    try {
      const newPrice = price !== undefined ? price : parseFloat(currentOffer.price);
      const oldPrice = parseFloat(currentOffer.price);
      const productId = currentOffer.productId;

      // Fetch product name once for alert messages
      const [product] = await db
        .select({ name: productsTable.name })
        .from(productsTable)
        .where(eq(productsTable.id, productId))
        .limit(1);
      const productName = product?.name ?? `Product #${productId}`;

      // §21 Vendor Competition Alert — notify OTHER vendor companies when a lower price is posted
      if (price !== undefined && newPrice < oldPrice) {
        const competingOffers = await db
          .select({
            vendorCompanyId: vendorOffersTable.vendorCompanyId,
            ownerId: companiesTable.ownerUserId,
            companyName: companiesTable.name,
          })
          .from(vendorOffersTable)
          .innerJoin(companiesTable, eq(vendorOffersTable.vendorCompanyId, companiesTable.id))
          .where(
            and(
              eq(vendorOffersTable.productId, productId),
              eq(vendorOffersTable.status, "active"),
              ne(vendorOffersTable.vendorCompanyId, vendorCompanyId),
            ),
          );

        for (const competitor of competingOffers) {
          if (competitor.ownerId) {
            await createNotification({
              userId: competitor.ownerId,
              type: "price_undercut",
              title: "A competitor undercut your price",
              message: `A competitor just listed ${productName} at ${newPrice.toFixed(2)}. Review your pricing to stay competitive.`,
              relatedId: productId,
            });
          }
        }
      }

      // §22 Buyer Price-Drop Alert — notify buyers who have previously purchased this product
      if (price !== undefined && newPrice < oldPrice) {
        const previousBuyers = await db
          .selectDistinct({ userId: ordersTable.buyerUserId })
          .from(orderItemsTable)
          .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
          .where(eq(orderItemsTable.productId, productId));

        for (const buyer of previousBuyers) {
          await createNotification({
            userId: buyer.userId,
            type: "price_drop",
            title: "Price drop on a product you bought",
            message: `${productName} is now available at ${newPrice.toFixed(2)} — lower than when you last ordered it.`,
            relatedId: productId,
          });
        }
      }

      // §8 Low-Stock Alert — notify the vendor when their own stock falls below threshold
      const newStock = body.data.stock;
      if (
        newStock !== undefined &&
        newStock < LOW_STOCK_THRESHOLD &&
        (currentOffer.stock === null || currentOffer.stock >= LOW_STOCK_THRESHOLD)
      ) {
        // Find owner of this vendor company
        const [vendorCompany] = await db
          .select({ ownerUserId: companiesTable.ownerUserId })
          .from(companiesTable)
          .where(eq(companiesTable.id, vendorCompanyId))
          .limit(1);

        if (vendorCompany?.ownerUserId) {
          await createNotification({
            userId: vendorCompany.ownerUserId,
            type: "low_stock",
            title: "Low stock warning",
            message: `Your stock for ${productName} has dropped to ${newStock} units. Consider restocking soon.`,
            relatedId: productId,
          });
        }
      }
    } catch {
      // Non-critical alerts — never let them break the main flow
    }
  })();

  res.json(UpdateOfferResponse.parse(updated));
});

router.delete("/offers/:id", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const params = DeleteOfferParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(vendorOffersTable)
    .where(and(eq(vendorOffersTable.id, params.data.id), eq(vendorOffersTable.vendorCompanyId, vendorCompanyId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }

  res.json(DeleteOfferResponse.parse({ success: true }));
});

router.get("/vendor/dashboard", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const [{ totalOffers }] = await db
    .select({ totalOffers: sql<number>`count(*)` })
    .from(vendorOffersTable)
    .where(eq(vendorOffersTable.vendorCompanyId, vendorCompanyId));

  const [{ totalOrders, revenue }] = await db
    .select({
      totalOrders: sql<number>`count(distinct ${orderItemsTable.orderId})`,
      revenue: sql<number>`coalesce(sum(${orderItemsTable.subtotal}), 0)`,
    })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.vendorCompanyId, vendorCompanyId));

  const [{ openRfqs }] = await db
    .select({ openRfqs: sql<number>`count(*)` })
    .from(rfqsTable)
    .where(eq(rfqsTable.status, "open"));

  res.json(
    GetVendorDashboardResponse.parse({
      totalOffers: Number(totalOffers),
      totalOrders: Number(totalOrders),
      revenue: Number(revenue),
      openRfqs: Number(openRfqs),
    }),
  );
});

// POST /vendor/offers/bulk-upload
router.post("/vendor/offers/bulk-upload", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const parsed = BulkUploadOffersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of parsed.data.rows) {
    try {
      // Validate productId exists
      const [product] = await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(eq(productsTable.id, row.productId))
        .limit(1);

      if (!product) {
        errors.push(`Row productId=${row.productId}: product not found`);
        continue;
      }

      // Check if an offer already exists for this vendor + product
      const [existing] = await db
        .select({ id: vendorOffersTable.id })
        .from(vendorOffersTable)
        .where(
          and(
            eq(vendorOffersTable.vendorCompanyId, vendorCompanyId),
            eq(vendorOffersTable.productId, row.productId),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(vendorOffersTable)
          .set({
            price: row.price.toFixed(2),
            moq: row.moq,
            stock: row.stock,
            deliveryDays: row.deliveryDays,
            updatedAt: new Date(),
          })
          .where(eq(vendorOffersTable.id, existing.id));
        updated++;
      } else {
        await db.insert(vendorOffersTable).values({
          productId: row.productId,
          vendorCompanyId,
          price: row.price.toFixed(2),
          moq: row.moq,
          stock: row.stock,
          deliveryDays: row.deliveryDays,
          priceTiers: [],
        });
        created++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Row productId=${row.productId}: ${msg}`);
    }
  }

  res.json(BulkUploadOffersResponse.parse({ created, updated, errors }));
});

export default router;
