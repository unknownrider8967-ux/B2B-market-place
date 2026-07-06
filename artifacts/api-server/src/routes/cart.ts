import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, cartItemsTable, vendorOffersTable, productsTable, companiesTable } from "@workspace/db";
import {
  ListCartItemsResponse,
  AddCartItemBody,
  AddCartItemResponse,
  UpdateCartItemParams,
  UpdateCartItemBody,
  UpdateCartItemResponse,
  RemoveCartItemParams,
  RemoveCartItemResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function cartItemDetailsQuery() {
  return db
    .select({
      id: cartItemsTable.id,
      userId: cartItemsTable.userId,
      offerId: cartItemsTable.offerId,
      quantity: cartItemsTable.quantity,
      createdAt: cartItemsTable.createdAt,
      productId: productsTable.id,
      productName: productsTable.name,
      productUnit: productsTable.unit,
      vendorCompanyId: companiesTable.id,
      vendorName: companiesTable.name,
      unitPrice: vendorOffersTable.price,
      moq: vendorOffersTable.moq,
      stock: vendorOffersTable.stock,
    })
    .from(cartItemsTable)
    .innerJoin(vendorOffersTable, eq(cartItemsTable.offerId, vendorOffersTable.id))
    .innerJoin(productsTable, eq(vendorOffersTable.productId, productsTable.id))
    .innerJoin(companiesTable, eq(vendorOffersTable.vendorCompanyId, companiesTable.id));
}

router.get("/cart", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const rows = await cartItemDetailsQuery().where(eq(cartItemsTable.userId, req.user.id));
  res.json(ListCartItemsResponse.parse(rows));
});

router.post("/cart", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const parsed = AddCartItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(cartItemsTable)
    .where(and(eq(cartItemsTable.userId, req.user.id), eq(cartItemsTable.offerId, parsed.data.offerId)));

  let cartItemId: number;
  if (existing) {
    const [updated] = await db
      .update(cartItemsTable)
      .set({ quantity: existing.quantity + parsed.data.quantity })
      .where(eq(cartItemsTable.id, existing.id))
      .returning();
    cartItemId = updated.id;
  } else {
    const [created] = await db
      .insert(cartItemsTable)
      .values({ ...parsed.data, userId: req.user.id })
      .returning();
    cartItemId = created.id;
  }

  const [row] = await cartItemDetailsQuery().where(eq(cartItemsTable.id, cartItemId));
  res.status(201).json(AddCartItemResponse.parse(row));
});

router.patch("/cart/:id", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const params = UpdateCartItemParams.safeParse(req.params);
  const body = UpdateCartItemBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }

  const [updated] = await db
    .update(cartItemsTable)
    .set({ quantity: body.data.quantity })
    .where(and(eq(cartItemsTable.id, params.data.id), eq(cartItemsTable.userId, req.user.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Cart item not found" });
    return;
  }

  const [row] = await cartItemDetailsQuery().where(eq(cartItemsTable.id, updated.id));
  res.json(UpdateCartItemResponse.parse(row));
});

router.delete("/cart/:id", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const params = RemoveCartItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(cartItemsTable)
    .where(and(eq(cartItemsTable.id, params.data.id), eq(cartItemsTable.userId, req.user.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Cart item not found" });
    return;
  }

  res.json(RemoveCartItemResponse.parse({ success: true }));
});

export default router;
