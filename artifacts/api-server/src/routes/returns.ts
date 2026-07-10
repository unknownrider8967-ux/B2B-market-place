import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, desc } from "drizzle-orm";
import {
  db,
  returnsTable,
  orderItemsTable,
  ordersTable,
  companiesTable,
  productsTable,
} from "@workspace/db";
import { insertReturnSchema, returnStatusEnum } from "@workspace/db";
import { getOrCreateProfile } from "../lib/profile";
import { createNotification } from "../lib/notifications";
import { z } from "zod";

const router: IRouter = Router();

// Vendors can only move a return to under_review / approved / rejected
const VendorUpdateReturnStatusBody = z.object({
  status: z.enum(["under_review", "approved", "rejected"]),
});
// Admins can set any status and add/edit admin notes
const AdminUpdateReturnStatusBody = z.object({
  status: returnStatusEnum,
  adminNote: z.string().max(2000).optional(),
});

const ReturnIdParams = z.object({ id: z.coerce.number().int().positive() });

// POST /returns — buyer submits a return/claim request
router.post("/returns", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "buyer") {
    res.status(403).json({ error: "Only buyers can submit return requests" });
    return;
  }

  const parsed = insertReturnSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { orderId, orderItemId, type, reason } = parsed.data;

  // Verify the order belongs to the buyer
  const [order] = await db
    .select({ buyerUserId: ordersTable.buyerUserId, buyerCompanyId: ordersTable.buyerCompanyId })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.buyerUserId, req.user.id)))
    .limit(1);

  if (!order) {
    res.status(403).json({ error: "Order not found or not yours" });
    return;
  }

  // Verify the order item belongs to this order
  const [orderItem] = await db
    .select({ vendorCompanyId: orderItemsTable.vendorCompanyId })
    .from(orderItemsTable)
    .where(and(eq(orderItemsTable.id, orderItemId), eq(orderItemsTable.orderId, orderId)))
    .limit(1);

  if (!orderItem) {
    res.status(400).json({ error: "Order item not found in this order" });
    return;
  }

  const [created] = await db
    .insert(returnsTable)
    .values({
      orderId,
      orderItemId,
      buyerUserId: req.user.id,
      buyerCompanyId: order.buyerCompanyId ?? null,
      vendorCompanyId: orderItem.vendorCompanyId,
      type,
      reason,
      status: "requested",
    })
    .returning();

  // Notify the vendor
  await createNotification(
    null,
    orderItem.vendorCompanyId,
    "return_requested",
    `A buyer has submitted a return request (${type}) for order #${orderId}.`,
    `/vendor/returns`,
  );

  res.status(201).json(created);
});

// GET /returns/mine — buyer lists their own returns
router.get("/returns/mine", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const rows = await db
    .select({
      id: returnsTable.id,
      orderId: returnsTable.orderId,
      orderItemId: returnsTable.orderItemId,
      buyerUserId: returnsTable.buyerUserId,
      buyerCompanyId: returnsTable.buyerCompanyId,
      vendorCompanyId: returnsTable.vendorCompanyId,
      type: returnsTable.type,
      reason: returnsTable.reason,
      status: returnsTable.status,
      adminNote: returnsTable.adminNote,
      createdAt: returnsTable.createdAt,
      updatedAt: returnsTable.updatedAt,
      productName: productsTable.name,
      vendorName: companiesTable.name,
    })
    .from(returnsTable)
    .leftJoin(orderItemsTable, eq(returnsTable.orderItemId, orderItemsTable.id))
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .leftJoin(companiesTable, eq(returnsTable.vendorCompanyId, companiesTable.id))
    .where(eq(returnsTable.buyerUserId, req.user.id))
    .orderBy(desc(returnsTable.createdAt));

  res.json(rows);
});

// GET /returns/vendor — vendor lists returns for their orders
router.get("/returns/vendor", async (req: Request, res: Response): Promise<void> => {
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
      id: returnsTable.id,
      orderId: returnsTable.orderId,
      orderItemId: returnsTable.orderItemId,
      buyerUserId: returnsTable.buyerUserId,
      buyerCompanyId: returnsTable.buyerCompanyId,
      vendorCompanyId: returnsTable.vendorCompanyId,
      type: returnsTable.type,
      reason: returnsTable.reason,
      status: returnsTable.status,
      adminNote: returnsTable.adminNote,
      createdAt: returnsTable.createdAt,
      updatedAt: returnsTable.updatedAt,
      productName: productsTable.name,
      vendorName: companiesTable.name,
    })
    .from(returnsTable)
    .leftJoin(orderItemsTable, eq(returnsTable.orderItemId, orderItemsTable.id))
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .leftJoin(companiesTable, eq(returnsTable.vendorCompanyId, companiesTable.id))
    .where(eq(returnsTable.vendorCompanyId, profile.companyId))
    .orderBy(desc(returnsTable.createdAt));

  res.json(rows);
});

// GET /admin/returns — admin lists all returns
router.get("/admin/returns", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const rows = await db
    .select({
      id: returnsTable.id,
      orderId: returnsTable.orderId,
      orderItemId: returnsTable.orderItemId,
      buyerUserId: returnsTable.buyerUserId,
      buyerCompanyId: returnsTable.buyerCompanyId,
      vendorCompanyId: returnsTable.vendorCompanyId,
      type: returnsTable.type,
      reason: returnsTable.reason,
      status: returnsTable.status,
      adminNote: returnsTable.adminNote,
      createdAt: returnsTable.createdAt,
      updatedAt: returnsTable.updatedAt,
      productName: productsTable.name,
      vendorName: companiesTable.name,
    })
    .from(returnsTable)
    .leftJoin(orderItemsTable, eq(returnsTable.orderItemId, orderItemsTable.id))
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .leftJoin(companiesTable, eq(returnsTable.vendorCompanyId, companiesTable.id))
    .orderBy(desc(returnsTable.createdAt));

  res.json(rows);
});

// PATCH /returns/:id/status — vendor or admin updates return status
router.patch("/returns/:id/status", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const params = ReturnIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid return id" });
    return;
  }

  const profile = await getOrCreateProfile(req.user.id);
  const [existing] = await db
    .select()
    .from(returnsTable)
    .where(eq(returnsTable.id, params.data.id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Return not found" });
    return;
  }

  type ReturnStatus = "requested" | "under_review" | "approved" | "rejected" | "refunded";
  let newStatus: ReturnStatus;
  let newAdminNote: string | null = existing.adminNote;

  if (profile.role === "vendor") {
    if (!profile.companyId || existing.vendorCompanyId !== profile.companyId) {
      res.status(403).json({ error: "Not your return to manage" });
      return;
    }
    // Vendors can only use the restricted set of transitions — no refunded, no adminNote
    const vendorParsed = VendorUpdateReturnStatusBody.safeParse(req.body);
    if (!vendorParsed.success) {
      res.status(400).json({ error: vendorParsed.error.message });
      return;
    }
    newStatus = vendorParsed.data.status;
  } else if (profile.role === "admin") {
    // Admins can set any status and write adminNote
    const adminParsed = AdminUpdateReturnStatusBody.safeParse(req.body);
    if (!adminParsed.success) {
      res.status(400).json({ error: adminParsed.error.message });
      return;
    }
    newStatus = adminParsed.data.status;
    newAdminNote = adminParsed.data.adminNote ?? existing.adminNote;
  } else {
    res.status(403).json({ error: "Vendor or admin required" });
    return;
  }

  const [updated] = await db
    .update(returnsTable)
    .set({
      status: newStatus,
      adminNote: newAdminNote,
    })
    .where(eq(returnsTable.id, params.data.id))
    .returning();

  // Notify the buyer of status change
  await createNotification(
    existing.buyerUserId,
    null,
    "return_status_updated",
    `Your return request for order #${existing.orderId} has been ${newStatus}.`,
    `/returns`,
  );

  res.json(updated);
});

export default router;
