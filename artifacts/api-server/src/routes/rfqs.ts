import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db, rfqsTable, rfqResponsesTable, companiesTable, productsTable } from "@workspace/db";
import {
  ListRfqsResponse,
  CreateRfqBody,
  CreateRfqResponse,
  GetRfqParams,
  GetRfqResponse,
  CreateRfqResponseParams,
  CreateRfqResponseBody,
  CreateRfqResponseResponse,
} from "@workspace/api-zod";
import { getOrCreateProfile } from "../lib/profile";
import { createNotification } from "../lib/notifications";

const router: IRouter = Router();

function rfqWithCountsQuery() {
  return db
    .select({
      id: rfqsTable.id,
      buyerUserId: rfqsTable.buyerUserId,
      buyerCompanyId: rfqsTable.buyerCompanyId,
      productId: rfqsTable.productId,
      title: rfqsTable.title,
      description: rfqsTable.description,
      quantity: rfqsTable.quantity,
      status: rfqsTable.status,
      createdAt: rfqsTable.createdAt,
      buyerCompanyName: companiesTable.name,
      productName: productsTable.name,
      responseCount: sql<number>`(select count(*) from ${rfqResponsesTable} where ${rfqResponsesTable.rfqId} = ${rfqsTable.id})`,
    })
    .from(rfqsTable)
    .leftJoin(companiesTable, eq(rfqsTable.buyerCompanyId, companiesTable.id))
    .leftJoin(productsTable, eq(rfqsTable.productId, productsTable.id));
}

router.get("/rfqs", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);

  const rows =
    profile.role === "buyer"
      ? await rfqWithCountsQuery().where(eq(rfqsTable.buyerUserId, req.user.id)).orderBy(rfqsTable.createdAt)
      : await rfqWithCountsQuery().where(eq(rfqsTable.status, "open")).orderBy(rfqsTable.createdAt);

  res.json(
    ListRfqsResponse.parse(
      rows.map((r) => ({ ...r, responseCount: Number(r.responseCount) })),
    ),
  );
});

router.post("/rfqs", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);

  const parsed = CreateRfqBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [created] = await db
    .insert(rfqsTable)
    .values({
      ...parsed.data,
      buyerUserId: req.user.id,
      buyerCompanyId: profile.companyId,
    })
    .returning();

  const [row] = await rfqWithCountsQuery().where(eq(rfqsTable.id, created.id));
  res.status(201).json(CreateRfqResponse.parse({ ...row, responseCount: Number(row.responseCount) }));
});

router.get("/rfqs/:id", async (req: Request, res: Response): Promise<void> => {
  const params = GetRfqParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await rfqWithCountsQuery().where(eq(rfqsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "RFQ not found" });
    return;
  }

  const responses = await db
    .select({
      id: rfqResponsesTable.id,
      rfqId: rfqResponsesTable.rfqId,
      vendorCompanyId: rfqResponsesTable.vendorCompanyId,
      price: rfqResponsesTable.price,
      quantity: rfqResponsesTable.quantity,
      leadTimeDays: rfqResponsesTable.leadTimeDays,
      terms: rfqResponsesTable.terms,
      createdAt: rfqResponsesTable.createdAt,
      vendorName: companiesTable.name,
    })
    .from(rfqResponsesTable)
    .innerJoin(companiesTable, eq(rfqResponsesTable.vendorCompanyId, companiesTable.id))
    .where(eq(rfqResponsesTable.rfqId, params.data.id));

  res.json(
    GetRfqResponse.parse({
      ...row,
      responseCount: Number(row.responseCount),
      responses,
    }),
  );
});

router.post("/rfqs/:id/responses", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "vendor" || !profile.companyId) {
    res.status(403).json({ error: "Vendor company required" });
    return;
  }

  const params = CreateRfqResponseParams.safeParse(req.params);
  const body = CreateRfqResponseBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }

  const [created] = await db
    .insert(rfqResponsesTable)
    .values({
      ...body.data,
      price: body.data.price.toFixed(2),
      rfqId: params.data.id,
      vendorCompanyId: profile.companyId,
    })
    .returning();

  // Notify the buyer that their RFQ received a vendor response
  const [rfqRow] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, params.data.id)).limit(1);
  if (rfqRow) {
    const [vendorCompany] = await db.select().from(companiesTable).where(eq(companiesTable.id, profile.companyId!)).limit(1);
    await createNotification({
      userId: rfqRow.buyerUserId,
      type: "rfq_response",
      title: "New Quotation Received 💬",
      message: `${vendorCompany?.name ?? "A vendor"} submitted a quote for your RFQ "${rfqRow.title}": ${body.data.price.toFixed(2)} for ${body.data.quantity} units.`,
      relatedId: params.data.id,
    });
  }

  res.status(201).json(CreateRfqResponseResponse.parse(created));
});

export default router;
