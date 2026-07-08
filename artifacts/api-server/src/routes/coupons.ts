import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db, couponsTable } from "@workspace/db";
import {
  ListCouponsResponse,
  CreateCouponBody,
  CreateCouponResponse,
  UpdateCouponParams,
  UpdateCouponBody,
  UpdateCouponResponse,
  DeleteCouponParams,
  ValidateCouponQueryParams,
  ValidateCouponResponse,
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

function computeDiscount(discountType: string, discountValue: number, subtotal: number): number {
  if (discountType === "percentage") {
    return Math.min(subtotal, (subtotal * discountValue) / 100);
  }
  // fixed
  return Math.min(subtotal, discountValue);
}

// GET /admin/coupons
router.get("/admin/coupons", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const rows = await db.select().from(couponsTable).orderBy(couponsTable.createdAt);
  res.json(ListCouponsResponse.parse(rows.map((r) => ({
    ...r,
    discountValue: Number(r.discountValue),
    minOrderValue: r.minOrderValue != null ? Number(r.minOrderValue) : null,
  }))));
});

// POST /admin/coupons
router.post("/admin/coupons", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const body = CreateCouponBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const { code, discountType, discountValue, minOrderValue, usageLimit, isActive, expiresAt } = body.data;
  const [created] = await db
    .insert(couponsTable)
    .values({
      code,
      discountType,
      discountValue: String(discountValue),
      minOrderValue: minOrderValue != null ? String(minOrderValue) : null,
      usageLimit: usageLimit ?? null,
      isActive: isActive ?? true,
      expiresAt: expiresAt ?? null,
    })
    .returning();
  res.status(201).json(CreateCouponResponse.parse({
    ...created,
    discountValue: Number(created.discountValue),
    minOrderValue: created.minOrderValue != null ? Number(created.minOrderValue) : null,
  }));
});

// PATCH /admin/coupons/:id
router.patch("/admin/coupons/:id", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = UpdateCouponParams.safeParse(req.params);
  const body = UpdateCouponBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }
  const { code, discountType, discountValue, minOrderValue, usageLimit, isActive, expiresAt } = body.data;
  const [updated] = await db
    .update(couponsTable)
    .set({
      code,
      discountType,
      discountValue: String(discountValue),
      minOrderValue: minOrderValue != null ? String(minOrderValue) : null,
      usageLimit: usageLimit ?? null,
      isActive: isActive ?? true,
      expiresAt: expiresAt ?? null,
    })
    .where(eq(couponsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Coupon not found" });
    return;
  }
  res.json(UpdateCouponResponse.parse({
    ...updated,
    discountValue: Number(updated.discountValue),
    minOrderValue: updated.minOrderValue != null ? Number(updated.minOrderValue) : null,
  }));
});

// DELETE /admin/coupons/:id
router.delete("/admin/coupons/:id", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = DeleteCouponParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(couponsTable).where(eq(couponsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Coupon not found" });
    return;
  }
  res.status(204).send();
});

// GET /coupons/validate?code=&subtotal=
router.get("/coupons/validate", async (req: Request, res: Response): Promise<void> => {
  const query = ValidateCouponQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { code, subtotal } = query.data;

  const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code));
  if (!coupon) {
    res.json(ValidateCouponResponse.parse({ valid: false, reason: "Coupon not found", discountAmount: 0 }));
    return;
  }
  if (!coupon.isActive) {
    res.json(ValidateCouponResponse.parse({ valid: false, reason: "Coupon is inactive", discountAmount: 0 }));
    return;
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    res.json(ValidateCouponResponse.parse({ valid: false, reason: "Coupon has expired", discountAmount: 0 }));
    return;
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    res.json(ValidateCouponResponse.parse({ valid: false, reason: "Coupon usage limit reached", discountAmount: 0 }));
    return;
  }
  const minOrderValue = coupon.minOrderValue != null ? Number(coupon.minOrderValue) : 0;
  if (subtotal < minOrderValue) {
    res.json(ValidateCouponResponse.parse({ valid: false, reason: `Minimum order value is $${minOrderValue.toFixed(2)}`, discountAmount: 0 }));
    return;
  }

  const discountAmount = computeDiscount(coupon.discountType, Number(coupon.discountValue), subtotal);
  res.json(ValidateCouponResponse.parse({ valid: true, reason: null, discountAmount }));
});

export { computeDiscount };
export default router;
