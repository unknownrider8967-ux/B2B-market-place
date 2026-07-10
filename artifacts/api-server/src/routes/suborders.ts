import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, desc } from "drizzle-orm";
import {
  db,
  vendorOrdersTable,
  orderItemsTable,
  productsTable,
  companiesTable,
  ordersTable,
} from "@workspace/db";
import { vendorOrderStatusEnum, poStatusEnum } from "@workspace/db";
import { getOrCreateProfile } from "../lib/profile";
import { createNotification } from "../lib/notifications";
import { z } from "zod";

const router: IRouter = Router();

const VendorOrderIdParams = z.object({ id: z.coerce.number().int().positive() });
const UpdatePoStatusBody = z.object({ poStatus: poStatusEnum });
const UpdateVendorOrderStatusBody = z.object({ status: vendorOrderStatusEnum });
const OrderIdParams = z.object({ id: z.coerce.number().int().positive() });

async function getVendorOrderWithItems(vendorOrderId: number) {
  const [vo] = await db
    .select()
    .from(vendorOrdersTable)
    .where(eq(vendorOrdersTable.id, vendorOrderId));
  if (!vo) return null;

  const items = await db
    .select({
      id: orderItemsTable.id,
      productId: orderItemsTable.productId,
      productName: productsTable.name,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
      subtotal: orderItemsTable.subtotal,
    })
    .from(orderItemsTable)
    .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(
      and(
        eq(orderItemsTable.orderId, vo.orderId),
        eq(orderItemsTable.vendorCompanyId, vo.vendorCompanyId),
      ),
    );

  return { ...vo, items };
}

// GET /vendor-orders/mine — vendor lists their sub-orders (POs)
router.get("/vendor-orders/mine", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "vendor" || !profile.companyId) {
    res.status(403).json({ error: "Vendor company required" }); return;
  }

  const vendorOrders = await db
    .select()
    .from(vendorOrdersTable)
    .where(eq(vendorOrdersTable.vendorCompanyId, profile.companyId))
    .orderBy(desc(vendorOrdersTable.createdAt));

  const results = await Promise.all(
    vendorOrders.map(async (vo) => {
      const items = await db
        .select({
          id: orderItemsTable.id,
          productId: orderItemsTable.productId,
          productName: productsTable.name,
          quantity: orderItemsTable.quantity,
          unitPrice: orderItemsTable.unitPrice,
          subtotal: orderItemsTable.subtotal,
        })
        .from(orderItemsTable)
        .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
        .where(
          and(
            eq(orderItemsTable.orderId, vo.orderId),
            eq(orderItemsTable.vendorCompanyId, vo.vendorCompanyId),
          ),
        );
      return { ...vo, items };
    }),
  );

  res.json(results);
});

// PATCH /vendor-orders/:id/po-status — vendor accepts or rejects a PO
router.patch("/vendor-orders/:id/po-status", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "vendor" || !profile.companyId) {
    res.status(403).json({ error: "Vendor company required" }); return;
  }

  const params = VendorOrderIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdatePoStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db
    .select()
    .from(vendorOrdersTable)
    .where(
      and(
        eq(vendorOrdersTable.id, params.data.id),
        eq(vendorOrdersTable.vendorCompanyId, profile.companyId),
      ),
    )
    .limit(1);
  if (!existing) { res.status(404).json({ error: "Vendor order not found" }); return; }

  const [updated] = await db
    .update(vendorOrdersTable)
    .set({ poStatus: parsed.data.poStatus, updatedAt: new Date() })
    .where(eq(vendorOrdersTable.id, params.data.id))
    .returning();

  // Notify the buyer
  const [order] = await db
    .select({ buyerUserId: ordersTable.buyerUserId })
    .from(ordersTable)
    .where(eq(ordersTable.id, existing.orderId))
    .limit(1);
  if (order) {
    await createNotification(
      order.buyerUserId,
      null,
      "po_status_updated",
      `Purchase Order ${existing.poNumber} has been ${parsed.data.poStatus} by the vendor.`,
      `/orders`,
    );
  }

  res.json(updated);
});

// PATCH /vendor-orders/:id/status — vendor updates fulfillment status (processing, shipped, etc.)
router.patch("/vendor-orders/:id/status", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "vendor" || !profile.companyId) {
    res.status(403).json({ error: "Vendor company required" }); return;
  }

  const params = VendorOrderIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateVendorOrderStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db
    .select()
    .from(vendorOrdersTable)
    .where(
      and(
        eq(vendorOrdersTable.id, params.data.id),
        eq(vendorOrdersTable.vendorCompanyId, profile.companyId),
      ),
    )
    .limit(1);
  if (!existing) { res.status(404).json({ error: "Vendor order not found" }); return; }

  const updateData: Record<string, unknown> = { status: parsed.data.status, updatedAt: new Date() };
  if (req.body.trackingNumber) updateData.trackingNumber = String(req.body.trackingNumber).slice(0, 60);

  const [updated] = await db
    .update(vendorOrdersTable)
    .set(updateData as any)
    .where(eq(vendorOrdersTable.id, params.data.id))
    .returning();

  res.json(updated);
});

// GET /orders/:id/vendor-orders — buyer sees the vendor sub-orders for their order
router.get("/orders/:id/vendor-orders", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const params = OrderIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid order id" }); return; }

  // Verify buyer owns the order
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.id, params.data.id),
        eq(ordersTable.buyerUserId, req.user.id),
      ),
    )
    .limit(1);
  if (!order) { res.status(403).json({ error: "Order not found or not yours" }); return; }

  const vendorOrders = await db
    .select({
      id: vendorOrdersTable.id,
      orderId: vendorOrdersTable.orderId,
      vendorCompanyId: vendorOrdersTable.vendorCompanyId,
      vendorName: companiesTable.name,
      poNumber: vendorOrdersTable.poNumber,
      status: vendorOrdersTable.status,
      poStatus: vendorOrdersTable.poStatus,
      subtotal: vendorOrdersTable.subtotal,
      trackingNumber: vendorOrdersTable.trackingNumber,
      createdAt: vendorOrdersTable.createdAt,
      updatedAt: vendorOrdersTable.updatedAt,
    })
    .from(vendorOrdersTable)
    .innerJoin(companiesTable, eq(vendorOrdersTable.vendorCompanyId, companiesTable.id))
    .where(eq(vendorOrdersTable.orderId, params.data.id))
    .orderBy(vendorOrdersTable.vendorCompanyId);

  res.json(vendorOrders);
});

export default router;
