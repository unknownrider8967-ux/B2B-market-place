import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, vendorOffersTable, productsTable, companiesTable, orderItemsTable, rfqsTable } from "@workspace/db";
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
} from "@workspace/api-zod";
import { getOrCreateProfile } from "../lib/profile";

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

router.patch("/offers/:id", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const params = UpdateOfferParams.safeParse(req.params);
  const body = UpdateOfferBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
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

export default router;
