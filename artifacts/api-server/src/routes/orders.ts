import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  cartItemsTable,
  vendorOffersTable,
  productsTable,
  companiesTable,
  ordersTable,
  orderItemsTable,
  couponsTable,
  vendorOrdersTable,
} from "@workspace/db";
import { computeDiscount } from "./coupons";
import {
  CheckoutCartResponse,
  ListMyOrdersResponse,
  ListVendorOrderItemsResponse,
  GetOrderParams,
  GetOrderResponse,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  UpdateOrderStatusResponse,
  ReorderOrderParams,
  ReorderOrderResponse,
} from "@workspace/api-zod";
import { getOrCreateProfile } from "../lib/profile";
import { createNotification } from "../lib/notifications";

const router: IRouter = Router();

function orderItemDetailQuery() {
  return db
    .select({
      id: orderItemsTable.id,
      orderId: orderItemsTable.orderId,
      offerId: orderItemsTable.offerId,
      productId: orderItemsTable.productId,
      productName: productsTable.name,
      vendorCompanyId: orderItemsTable.vendorCompanyId,
      vendorName: companiesTable.name,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
      subtotal: orderItemsTable.subtotal,
    })
    .from(orderItemsTable)
    .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .innerJoin(companiesTable, eq(orderItemsTable.vendorCompanyId, companiesTable.id));
}

async function buildOrderWithItems(orderId: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  const items = await orderItemDetailQuery().where(eq(orderItemsTable.orderId, orderId));
  return { ...order, items };
}

router.post("/orders/checkout", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const profile = await getOrCreateProfile(req.user.id);

  const cartRows = await db
    .select({
      offerId: cartItemsTable.offerId,
      quantity: cartItemsTable.quantity,
      productId: vendorOffersTable.productId,
      vendorCompanyId: vendorOffersTable.vendorCompanyId,
      price: vendorOffersTable.price,
    })
    .from(cartItemsTable)
    .innerJoin(vendorOffersTable, eq(cartItemsTable.offerId, vendorOffersTable.id))
    .where(eq(cartItemsTable.userId, req.user.id));

  if (cartRows.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  const subtotal = cartRows.reduce((sum, row) => sum + Number(row.price) * row.quantity, 0);

  // Optional coupon handling
  const couponCode: string | undefined =
    typeof req.body?.couponCode === "string" && req.body.couponCode.trim() !== ""
      ? (req.body.couponCode as string).trim()
      : undefined;

  let discountAmount = 0;
  let validatedCoupon: typeof couponsTable.$inferSelect | undefined;

  if (couponCode) {
    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, couponCode));
    if (coupon && coupon.isActive && !(coupon.expiresAt && coupon.expiresAt < new Date())) {
      const usageOk = coupon.usageLimit == null || coupon.usedCount < coupon.usageLimit;
      const minOk = coupon.minOrderValue == null || subtotal >= Number(coupon.minOrderValue);
      if (usageOk && minOk) {
        discountAmount = computeDiscount(coupon.discountType, Number(coupon.discountValue), subtotal);
        validatedCoupon = coupon;
      }
    }
  }

  const totalAmount = Math.max(0, subtotal - discountAmount);

  const [order] = await db
    .insert(ordersTable)
    .values({
      buyerUserId: req.user.id,
      buyerCompanyId: profile.companyId,
      status: "pending",
      totalAmount: totalAmount.toFixed(2),
      couponCode: validatedCoupon ? couponCode! : null,
      discountAmount: discountAmount.toFixed(2),
    })
    .returning();

  if (validatedCoupon) {
    await db
      .update(couponsTable)
      .set({ usedCount: validatedCoupon.usedCount + 1 })
      .where(eq(couponsTable.id, validatedCoupon.id));
  }

  await db.insert(orderItemsTable).values(
    cartRows.map((row) => ({
      orderId: order.id,
      offerId: row.offerId,
      productId: row.productId,
      vendorCompanyId: row.vendorCompanyId,
      quantity: row.quantity,
      unitPrice: row.price,
      subtotal: (Number(row.price) * row.quantity).toFixed(2),
    })),
  );

  // Group cart rows by vendor and create one vendor sub-order per vendor
  const vendorGroups = new Map<number, typeof cartRows>();
  for (const row of cartRows) {
    if (!vendorGroups.has(row.vendorCompanyId)) {
      vendorGroups.set(row.vendorCompanyId, []);
    }
    vendorGroups.get(row.vendorCompanyId)!.push(row);
  }
  for (const [vendorCompanyId, rows] of vendorGroups) {
    const vendorSubtotal = rows.reduce((sum, r) => sum + Number(r.price) * r.quantity, 0);
    const poNumber = `PO-${order.id}-${vendorCompanyId}-${Date.now().toString(36)}`;
    await db.insert(vendorOrdersTable).values({
      orderId: order.id,
      vendorCompanyId,
      poNumber,
      status: "pending",
      poStatus: "pending",
      subtotal: vendorSubtotal.toFixed(2),
    });
  }

  await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, req.user.id));

  const result = await buildOrderWithItems(order.id);
  res.status(201).json(CheckoutCartResponse.parse(result));
});

router.get("/orders", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.buyerUserId, req.user.id))
    .orderBy(ordersTable.createdAt);

  const results = await Promise.all(
    orders.map(async (order) => {
      const items = await orderItemDetailQuery().where(eq(orderItemsTable.orderId, order.id));
      return { ...order, items };
    }),
  );

  res.json(ListMyOrdersResponse.parse(results));
});

router.get("/orders/vendor", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "vendor" || !profile.companyId) {
    res.status(403).json({ error: "Vendor company required" });
    return;
  }

  const rows = await db
    .select({
      id: orderItemsTable.id,
      orderId: orderItemsTable.orderId,
      offerId: orderItemsTable.offerId,
      productId: orderItemsTable.productId,
      productName: productsTable.name,
      vendorCompanyId: orderItemsTable.vendorCompanyId,
      vendorName: companiesTable.name,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
      subtotal: orderItemsTable.subtotal,
      orderStatus: ordersTable.status,
      orderCreatedAt: ordersTable.createdAt,
    })
    .from(orderItemsTable)
    .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .innerJoin(companiesTable, eq(orderItemsTable.vendorCompanyId, companiesTable.id))
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(eq(orderItemsTable.vendorCompanyId, profile.companyId))
    .orderBy(ordersTable.createdAt);

  res.json(ListVendorOrderItemsResponse.parse(rows));
});

router.get("/orders/:id", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const result = await buildOrderWithItems(order.id);
  res.json(GetOrderResponse.parse(result));
});

router.patch("/orders/:id/status", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "vendor" && profile.role !== "admin") {
    res.status(403).json({ error: "Vendor or admin access required" });
    return;
  }

  const params = UpdateOrderStatusParams.safeParse(req.params);
  const body = UpdateOrderStatusBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }

  if (profile.role === "vendor") {
    const [hasItems] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orderItemsTable)
      .where(and(eq(orderItemsTable.orderId, params.data.id), eq(orderItemsTable.vendorCompanyId, profile.companyId!)));
    if (Number(hasItems.count) === 0) {
      res.status(403).json({ error: "You do not have items in this order" });
      return;
    }
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ status: body.data.status })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // Notify the buyer about the order status change
  const statusLabels: Record<string, string> = {
    confirmed: "confirmed ✅",
    shipped: "shipped 🚚",
    completed: "completed 🎉",
    cancelled: "cancelled ❌",
  };
  const label = statusLabels[body.data.status];
  if (label) {
    await createNotification({
      userId: updated.buyerUserId,
      type: "order_status",
      title: `Order #${updated.id} ${label}`,
      message: `Your order #${updated.id} (total ${Number(updated.totalAmount).toFixed(2)}) has been ${body.data.status}.`,
      relatedId: updated.id,
    });
  }

  const result = await buildOrderWithItems(updated.id);
  res.json(UpdateOrderStatusResponse.parse(result));
});

// POST /orders/:id/reorder — buyer: re-add all items from a past order to their cart
router.post("/orders/:id/reorder", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "buyer") {
    res.status(403).json({ error: "Buyer access required" });
    return;
  }

  const params = ReorderOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, params.data.id), eq(ordersTable.buyerUserId, req.user.id)));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const items = await db
    .select({
      offerId: orderItemsTable.offerId,
      quantity: orderItemsTable.quantity,
      offerStatus: vendorOffersTable.status,
    })
    .from(orderItemsTable)
    .leftJoin(vendorOffersTable, eq(orderItemsTable.offerId, vendorOffersTable.id))
    .where(eq(orderItemsTable.orderId, params.data.id));

  let itemsAdded = 0;
  for (const item of items) {
    // Skip offers that no longer exist or are not active
    if (!item.offerStatus || item.offerStatus !== "active") continue;

    const existing = await db
      .select()
      .from(cartItemsTable)
      .where(and(eq(cartItemsTable.userId, req.user.id), eq(cartItemsTable.offerId, item.offerId)));

    if (existing.length > 0) {
      await db
        .update(cartItemsTable)
        .set({ quantity: existing[0].quantity + item.quantity })
        .where(and(eq(cartItemsTable.userId, req.user.id), eq(cartItemsTable.offerId, item.offerId)));
    } else {
      await db.insert(cartItemsTable).values({
        userId: req.user.id,
        offerId: item.offerId,
        quantity: item.quantity,
      });
    }
    itemsAdded++;
  }

  res.json(ReorderOrderResponse.parse({ itemsAdded }));
});

export default router;
