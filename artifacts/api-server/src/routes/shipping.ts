import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, shippingZonesTable } from "@workspace/db";
import {
  ListMyShippingZonesResponse,
  CreateShippingZoneBody,
  CreateShippingZoneResponse,
  UpdateShippingZoneParams,
  UpdateShippingZoneBody,
  UpdateShippingZoneResponse,
  DeleteShippingZoneParams,
} from "@workspace/api-zod";
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

router.get("/vendor/shipping-zones", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const rows = await db
    .select()
    .from(shippingZonesTable)
    .where(eq(shippingZonesTable.vendorCompanyId, vendorCompanyId))
    .orderBy(shippingZonesTable.createdAt);

  const parsed = rows.map((r) => ({
    ...r,
    rate: parseFloat(r.rate),
  }));

  res.json(ListMyShippingZonesResponse.parse(parsed));
});

router.post("/vendor/shipping-zones", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const body = CreateShippingZoneBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [created] = await db
    .insert(shippingZonesTable)
    .values({
      vendorCompanyId,
      name: body.data.name,
      regions: body.data.regions,
      rate: body.data.rate.toFixed(2),
      etaDays: body.data.etaDays,
    })
    .returning();

  res.status(201).json(CreateShippingZoneResponse.parse({ ...created, rate: parseFloat(created.rate) }));
});

router.patch("/vendor/shipping-zones/:id", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const params = UpdateShippingZoneParams.safeParse(req.params);
  const body = UpdateShippingZoneBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }

  const [updated] = await db
    .update(shippingZonesTable)
    .set({
      name: body.data.name,
      regions: body.data.regions,
      rate: body.data.rate.toFixed(2),
      etaDays: body.data.etaDays,
    })
    .where(and(eq(shippingZonesTable.id, params.data.id), eq(shippingZonesTable.vendorCompanyId, vendorCompanyId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Shipping zone not found" });
    return;
  }

  res.json(UpdateShippingZoneResponse.parse({ ...updated, rate: parseFloat(updated.rate) }));
});

router.delete("/vendor/shipping-zones/:id", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const params = DeleteShippingZoneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(shippingZonesTable)
    .where(and(eq(shippingZonesTable.id, params.data.id), eq(shippingZonesTable.vendorCompanyId, vendorCompanyId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Shipping zone not found" });
    return;
  }

  res.status(204).send();
});

export default router;
