import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  companiesTable,
  productsTable,
  ordersTable,
  rfqsTable,
} from "@workspace/db";
import {
  ListAdminCompaniesQueryParams,
  ListAdminCompaniesResponse,
  UpdateCompanyStatusParams,
  UpdateCompanyStatusBody,
  UpdateCompanyStatusResponse,
  GetAdminDashboardResponse,
} from "@workspace/api-zod";
import { getOrCreateProfile } from "../lib/profile";
import { createNotification } from "../lib/notifications";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

router.get("/admin/companies", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const query = ListAdminCompaniesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = query.data.status
    ? await db.select().from(companiesTable).where(eq(companiesTable.status, query.data.status))
    : await db.select().from(companiesTable);

  res.json(ListAdminCompaniesResponse.parse(rows));
});

router.patch("/admin/companies/:id/status", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = UpdateCompanyStatusParams.safeParse(req.params);
  const body = UpdateCompanyStatusBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }

  const [updated] = await db
    .update(companiesTable)
    .set({ status: body.data.status, updatedAt: new Date() })
    .where(eq(companiesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  // Notify company owner about status change
  const statusMessages: Record<string, { title: string; message: string }> = {
    approved: {
      title: "Company Approved ✅",
      message: `Your company "${updated.name}" has been approved. You can now start using the marketplace.`,
    },
    rejected: {
      title: "Company Application Rejected",
      message: `Your company "${updated.name}" application was rejected. Please contact support for more information.`,
    },
    suspended: {
      title: "Company Suspended",
      message: `Your company "${updated.name}" has been suspended. Please contact support.`,
    },
  };
  const notif = statusMessages[body.data.status];
  if (notif) {
    await createNotification({
      userId: updated.ownerUserId,
      type: `company_${body.data.status}`,
      title: notif.title,
      message: notif.message,
      relatedId: updated.id,
    });
  }

  // Log the status change to audit trail
  await logAudit({
    userId: req.user!.id,
    action: "company_status_change",
    entityType: "company",
    entityId: updated.id,
    metadata: { status: body.data.status },
  });

  res.json(UpdateCompanyStatusResponse.parse(updated));
});

router.get("/admin/dashboard", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const [{ totalRevenue, totalOrders }] = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)`,
      totalOrders: sql<number>`count(*)`,
    })
    .from(ordersTable);

  const [{ activeVendors }] = await db
    .select({ activeVendors: sql<number>`count(*)` })
    .from(companiesTable)
    .where(sql`${companiesTable.type} = 'vendor' and ${companiesTable.status} = 'approved'`);

  const [{ activeBuyers }] = await db
    .select({ activeBuyers: sql<number>`count(*)` })
    .from(companiesTable)
    .where(sql`${companiesTable.type} = 'buyer' and ${companiesTable.status} = 'approved'`);

  const [{ pendingApprovals }] = await db
    .select({ pendingApprovals: sql<number>`count(*)` })
    .from(companiesTable)
    .where(eq(companiesTable.status, "pending"));

  const [{ totalProducts }] = await db
    .select({ totalProducts: sql<number>`count(*)` })
    .from(productsTable);

  const [{ openRfqs }] = await db
    .select({ openRfqs: sql<number>`count(*)` })
    .from(rfqsTable)
    .where(eq(rfqsTable.status, "open"));

  res.json(
    GetAdminDashboardResponse.parse({
      totalRevenue: Number(totalRevenue),
      totalOrders: Number(totalOrders),
      activeVendors: Number(activeVendors),
      activeBuyers: Number(activeBuyers),
      pendingApprovals: Number(pendingApprovals),
      totalProducts: Number(totalProducts),
      openRfqs: Number(openRfqs),
    }),
  );
});

export default router;
