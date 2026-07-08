import { Router, type IRouter, type Request, type Response } from "express";
import { and, avg, count, countDistinct, eq, sql } from "drizzle-orm";
import { db, vendorOffersTable, orderItemsTable, ordersTable, reviewsTable, companiesTable, vendorOrdersTable } from "@workspace/db";
import { GetMyVendorScorecardResponse, GetVendorScorecardParams, GetVendorScorecardResponse } from "@workspace/api-zod";
import { getOrCreateProfile } from "../lib/profile";

const router: IRouter = Router();

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

async function computeScorecard(vendorCompanyId: number) {
  // Total distinct orders involving this vendor (from order_items)
  const [orderCounts] = await db
    .select({
      totalOrders: countDistinct(orderItemsTable.orderId),
    })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.vendorCompanyId, vendorCompanyId));

  // Fulfillment rate = completed vendor_orders / total vendor_orders for this vendor
  const [allVendorOrders] = await db
    .select({ total: count() })
    .from(vendorOrdersTable)
    .where(eq(vendorOrdersTable.vendorCompanyId, vendorCompanyId));

  const [completedVendorOrders] = await db
    .select({ total: count() })
    .from(vendorOrdersTable)
    .where(
      and(
        eq(vendorOrdersTable.vendorCompanyId, vendorCompanyId),
        eq(vendorOrdersTable.status, "completed"),
      ),
    );

  const [cancelledVendorOrders] = await db
    .select({ total: count() })
    .from(vendorOrdersTable)
    .where(
      and(
        eq(vendorOrdersTable.vendorCompanyId, vendorCompanyId),
        eq(vendorOrdersTable.status, "cancelled"),
      ),
    );

  const totalVendorOrders = Number(allVendorOrders?.total ?? 0);
  const completedCount = Number(completedVendorOrders?.total ?? 0);
  const cancelledCount = Number(cancelledVendorOrders?.total ?? 0);

  const fulfillmentRate = totalVendorOrders > 0 ? completedCount / totalVendorOrders : 0;
  const cancellationRate = totalVendorOrders > 0 ? cancelledCount / totalVendorOrders : 0;

  // Average delivery days from vendor's active offers
  const [deliveryAvg] = await db
    .select({ avg: avg(vendorOffersTable.deliveryDays) })
    .from(vendorOffersTable)
    .where(
      and(
        eq(vendorOffersTable.vendorCompanyId, vendorCompanyId),
        eq(vendorOffersTable.status, "active"),
      ),
    );

  // Average rating and total reviews for this vendor
  const [reviewStats] = await db
    .select({
      avgRating: avg(reviewsTable.rating),
      totalReviews: count(),
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.vendorCompanyId, vendorCompanyId));

  return {
    vendorCompanyId,
    fulfillmentRate: Math.round(fulfillmentRate * 10000) / 10000,
    cancellationRate: Math.round(cancellationRate * 10000) / 10000,
    avgDeliveryDays: Number(deliveryAvg?.avg ?? 0),
    avgRating: Number(reviewStats?.avgRating ?? 0),
    totalOrders: Number(orderCounts?.totalOrders ?? 0),
    totalReviews: Number(reviewStats?.totalReviews ?? 0),
  };
}

// GET /vendor/scorecard — current vendor's own scorecard
router.get("/vendor/scorecard", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const scorecard = await computeScorecard(vendorCompanyId);
  res.json(GetMyVendorScorecardResponse.parse(scorecard));
});

// GET /admin/companies/:id/scorecard — admin view of a specific vendor's scorecard
router.get("/admin/companies/:id/scorecard", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = GetVendorScorecardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Verify the company exists
  const [company] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.id, params.data.id))
    .limit(1);

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const scorecard = await computeScorecard(params.data.id);
  res.json(GetVendorScorecardResponse.parse(scorecard));
});

export default router;
