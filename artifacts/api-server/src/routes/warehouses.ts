import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, or, sql } from "drizzle-orm";
import { db, warehousesTable, vendorOffersTable, productsTable } from "@workspace/db";
import {
  ListMyWarehousesResponse,
  CreateWarehouseBody,
  CreateWarehouseResponse,
  UpdateWarehouseParams,
  UpdateWarehouseBody,
  UpdateWarehouseResponse,
  DeleteWarehouseParams,
  ListInventoryAlertsResponse,
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

router.get("/vendor/warehouses", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const rows = await db
    .select()
    .from(warehousesTable)
    .where(eq(warehousesTable.vendorCompanyId, vendorCompanyId))
    .orderBy(warehousesTable.createdAt);

  res.json(ListMyWarehousesResponse.parse(rows));
});

router.post("/vendor/warehouses", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const body = CreateWarehouseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [created] = await db
    .insert(warehousesTable)
    .values({
      vendorCompanyId,
      name: body.data.name,
      address: body.data.address ?? null,
    })
    .returning();

  res.status(201).json(CreateWarehouseResponse.parse(created));
});

router.patch("/vendor/warehouses/:id", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const params = UpdateWarehouseParams.safeParse(req.params);
  const body = UpdateWarehouseBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }

  const [updated] = await db
    .update(warehousesTable)
    .set({ name: body.data.name, address: body.data.address ?? null })
    .where(and(eq(warehousesTable.id, params.data.id), eq(warehousesTable.vendorCompanyId, vendorCompanyId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Warehouse not found" });
    return;
  }

  res.json(UpdateWarehouseResponse.parse(updated));
});

router.delete("/vendor/warehouses/:id", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const params = DeleteWarehouseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(warehousesTable)
    .where(and(eq(warehousesTable.id, params.data.id), eq(warehousesTable.vendorCompanyId, vendorCompanyId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Warehouse not found" });
    return;
  }

  res.status(204).send();
});

router.get("/vendor/inventory/alerts", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const rows = await db
    .select({
      offerId: vendorOffersTable.id,
      productId: vendorOffersTable.productId,
      productName: productsTable.name,
      stock: vendorOffersTable.stock,
      lowStockThreshold: vendorOffersTable.lowStockThreshold,
    })
    .from(vendorOffersTable)
    .innerJoin(productsTable, eq(vendorOffersTable.productId, productsTable.id))
    .where(
      and(
        eq(vendorOffersTable.vendorCompanyId, vendorCompanyId),
        or(
          eq(vendorOffersTable.stock, 0),
          sql`${vendorOffersTable.stock} <= ${vendorOffersTable.lowStockThreshold}`,
        ),
      ),
    );

  const alerts = rows.map((row) => ({
    offerId: row.offerId,
    productId: row.productId,
    productName: row.productName,
    stock: row.stock ?? 0,
    lowStockThreshold: row.lowStockThreshold,
    severity: (row.stock === null || row.stock === 0) ? "out_of_stock" as const : "low_stock" as const,
  }));

  res.json(ListInventoryAlertsResponse.parse(alerts));
});

export default router;
