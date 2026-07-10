import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, invoicesTable, ordersTable, companiesTable } from "@workspace/db";
import { getOrCreateProfile } from "../lib/profile";
import { z } from "zod";

const router: IRouter = Router();

const UpdateInvoiceStatusBody = z.object({
  status: z.enum(["paid", "overdue"]),
});
const InvoiceIdParams = z.object({ id: z.coerce.number().int().positive() });

// GET /invoices/mine — buyer lists their invoices (credit-term orders)
router.get("/invoices/mine", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (!profile.companyId) { res.json([]); return; }

  const rows = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.buyerCompanyId, profile.companyId))
    .orderBy(desc(invoicesTable.createdAt));

  res.json(rows);
});

// GET /admin/invoices — admin lists all invoices
router.get("/admin/invoices", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const rows = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      orderId: invoicesTable.orderId,
      buyerCompanyId: invoicesTable.buyerCompanyId,
      buyerName: companiesTable.name,
      amount: invoicesTable.amount,
      dueDate: invoicesTable.dueDate,
      status: invoicesTable.status,
      createdAt: invoicesTable.createdAt,
      paidAt: invoicesTable.paidAt,
    })
    .from(invoicesTable)
    .innerJoin(companiesTable, eq(invoicesTable.buyerCompanyId, companiesTable.id))
    .orderBy(desc(invoicesTable.createdAt));

  res.json(rows);
});

// PATCH /invoices/:id/status — admin marks an invoice paid or overdue
router.patch("/invoices/:id/status", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const params = InvoiceIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateInvoiceStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const paidAt = parsed.data.status === "paid" ? new Date() : null;

  const [updated] = await db
    .update(invoicesTable)
    .set({ status: parsed.data.status, paidAt })
    .where(eq(invoicesTable.id, params.data.id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(updated);
});

export default router;
