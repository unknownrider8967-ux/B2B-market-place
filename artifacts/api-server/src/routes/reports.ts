import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, companiesTable, reviewsTable, commissionRulesTable } from "@workspace/db";
import {
  GetSalesReportQueryParams,
  GetSalesReportResponse,
  GetVendorReportResponse,
  GetCommissionReportResponse,
} from "@workspace/api-zod";
import { getOrCreateProfile } from "../lib/profile";

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

// GET /admin/reports/sales?days=
router.get("/admin/reports/sales", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const query = GetSalesReportQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const days = query.data.days;

  const points = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${ordersTable.createdAt}), 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)`,
      orders: sql<number>`count(*)`,
    })
    .from(ordersTable)
    .where(sql`${ordersTable.createdAt} >= now() - interval '1 day' * ${days}`)
    .groupBy(sql`date_trunc('day', ${ordersTable.createdAt})`)
    .orderBy(sql`date_trunc('day', ${ordersTable.createdAt})`);

  const totalRevenue = points.reduce((s, p) => s + Number(p.revenue), 0);
  const totalOrders = points.reduce((s, p) => s + Number(p.orders), 0);

  res.json(
    GetSalesReportResponse.parse({
      points: points.map((p) => ({
        date: p.date,
        revenue: Number(p.revenue),
        orders: Number(p.orders),
      })),
      totalRevenue,
      totalOrders,
    }),
  );
});

// GET /admin/reports/vendors
router.get("/admin/reports/vendors", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const rows = await db
    .select({
      vendorCompanyId: orderItemsTable.vendorCompanyId,
      vendorName: companiesTable.name,
      totalOrders: sql<number>`count(distinct ${orderItemsTable.orderId})`,
      totalRevenue: sql<number>`coalesce(sum(${orderItemsTable.subtotal}), 0)`,
      avgRating: sql<number>`coalesce(avg(${reviewsTable.rating}), 0)`,
    })
    .from(orderItemsTable)
    .innerJoin(companiesTable, eq(orderItemsTable.vendorCompanyId, companiesTable.id))
    .leftJoin(reviewsTable, eq(orderItemsTable.vendorCompanyId, reviewsTable.vendorCompanyId))
    .groupBy(orderItemsTable.vendorCompanyId, companiesTable.name)
    .orderBy(sql`sum(${orderItemsTable.subtotal}) desc nulls last`);

  res.json(
    GetVendorReportResponse.parse(
      rows.map((r) => ({
        vendorCompanyId: r.vendorCompanyId,
        vendorName: r.vendorName,
        totalOrders: Number(r.totalOrders),
        totalRevenue: Number(r.totalRevenue),
        avgRating: Number(r.avgRating),
      })),
    ),
  );
});

// GET /admin/reports/commission
router.get("/admin/reports/commission", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  // Get revenue per vendor subtype
  const revenueRows = await db
    .select({
      subtype: companiesTable.subtype,
      totalRevenue: sql<number>`coalesce(sum(${orderItemsTable.subtotal}), 0)`,
    })
    .from(orderItemsTable)
    .innerJoin(companiesTable, eq(orderItemsTable.vendorCompanyId, companiesTable.id))
    .groupBy(companiesTable.subtype)
    .orderBy(companiesTable.subtype);

  // Try to get commission rules per subtype
  const rules = await db.select().from(commissionRulesTable).where(eq(commissionRulesTable.isActive, true));

  const defaultRule = rules.find((r) => r.isDefault);
  const defaultRate = defaultRule ? Number(defaultRule.percentage) : 5; // fallback 5%

  const result = revenueRows.map((row) => {
    const matchingRule = rules.find((r) => r.vendorSubtype === row.subtype);
    const ratePercent = matchingRule ? Number(matchingRule.percentage) : defaultRate;
    const totalRevenue = Number(row.totalRevenue);
    const totalCommission = (totalRevenue * ratePercent) / 100;
    return {
      subtype: row.subtype,
      ratePercent,
      totalRevenue,
      totalCommission,
    };
  });

  res.json(GetCommissionReportResponse.parse(result));
});

export default router;
