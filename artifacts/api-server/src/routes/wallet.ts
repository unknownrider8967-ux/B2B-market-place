import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, desc, sql } from "drizzle-orm";
import {
  db,
  vendorWalletsTable,
  walletTransactionsTable,
  payoutRequestsTable,
  companiesTable,
} from "@workspace/db";
import {
  GetMyWalletResponse,
  CreatePayoutRequestBody,
  CreatePayoutRequestResponse,
  ListMyPayoutRequestsResponse,
  ListAdminPayoutRequestsResponse,
  UpdatePayoutRequestStatusParams,
  UpdatePayoutRequestStatusBody,
  UpdatePayoutRequestStatusResponse,
} from "@workspace/api-zod";
import { getOrCreateProfile } from "../lib/profile";
import { createNotification } from "../lib/notifications";

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

/** Ensure a wallet row exists for this vendor company, creating a zero-balance one if not. */
export async function getOrCreateWallet(vendorCompanyId: number) {
  const [existing] = await db
    .select()
    .from(vendorWalletsTable)
    .where(eq(vendorWalletsTable.vendorCompanyId, vendorCompanyId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(vendorWalletsTable)
    .values({ vendorCompanyId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  const [row] = await db
    .select()
    .from(vendorWalletsTable)
    .where(eq(vendorWalletsTable.vendorCompanyId, vendorCompanyId))
    .limit(1);
  return row;
}

router.get("/wallet/mine", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const wallet = await getOrCreateWallet(vendorCompanyId);
  const transactions = await db
    .select()
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.vendorCompanyId, vendorCompanyId))
    .orderBy(desc(walletTransactionsTable.createdAt))
    .limit(50);

  res.json(
    GetMyWalletResponse.parse({
      id: wallet.id,
      vendorCompanyId: wallet.vendorCompanyId,
      availableBalance: Number(wallet.availableBalance),
      pendingBalance: Number(wallet.pendingBalance),
      transactions: transactions.map((t) => ({
        id: t.id,
        walletId: wallet.id,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        relatedOrderId: t.relatedOrderId,
        createdAt: t.createdAt,
      })),
    }),
  );
});

router.post("/wallet/payout-requests", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const parsed = CreatePayoutRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await getOrCreateWallet(vendorCompanyId);
  const amountStr = parsed.data.amount.toFixed(2);

  const request = await db.transaction(async (tx) => {
    // Atomic, race-safe reservation: only move funds if available balance still covers the
    // request at the moment of the write (guards concurrent payout requests overdrawing).
    const [movedWallet] = await tx
      .update(vendorWalletsTable)
      .set({
        availableBalance: sql`${vendorWalletsTable.availableBalance} - ${amountStr}`,
        pendingBalance: sql`${vendorWalletsTable.pendingBalance} + ${amountStr}`,
      })
      .where(
        and(
          eq(vendorWalletsTable.vendorCompanyId, vendorCompanyId),
          sql`${vendorWalletsTable.availableBalance} >= ${amountStr}`,
        ),
      )
      .returning();

    if (!movedWallet) return null;

    const [created] = await tx
      .insert(payoutRequestsTable)
      .values({ vendorCompanyId, amount: amountStr })
      .returning();
    return created;
  });

  if (!request) {
    res.status(400).json({ error: "Amount exceeds available balance" });
    return;
  }

  res.status(201).json(CreatePayoutRequestResponse.parse(request));
});

router.get("/wallet/payout-requests/mine", async (req: Request, res: Response): Promise<void> => {
  const vendorCompanyId = await requireVendorCompany(req, res);
  if (vendorCompanyId === null) return;

  const rows = await db
    .select()
    .from(payoutRequestsTable)
    .where(eq(payoutRequestsTable.vendorCompanyId, vendorCompanyId))
    .orderBy(desc(payoutRequestsTable.createdAt));

  res.json(ListMyPayoutRequestsResponse.parse(rows));
});

router.get("/admin/payout-requests", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const rows = await db
    .select({
      id: payoutRequestsTable.id,
      vendorCompanyId: payoutRequestsTable.vendorCompanyId,
      amount: payoutRequestsTable.amount,
      status: payoutRequestsTable.status,
      createdAt: payoutRequestsTable.createdAt,
      vendorName: companiesTable.name,
    })
    .from(payoutRequestsTable)
    .innerJoin(companiesTable, eq(payoutRequestsTable.vendorCompanyId, companiesTable.id))
    .orderBy(desc(payoutRequestsTable.createdAt));

  res.json(ListAdminPayoutRequestsResponse.parse(rows));
});

router.patch(
  "/admin/payout-requests/:id/status",
  async (req: Request, res: Response): Promise<void> => {
    if (!(await requireAdmin(req, res))) return;

    const params = UpdatePayoutRequestStatusParams.safeParse(req.params);
    const body = UpdatePayoutRequestStatusBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: (params.error ?? body.error)!.message });
      return;
    }

    // Valid transitions: pending -> approved | rejected, approved -> paid.
    const requiredFromStatus: Record<string, "pending" | "approved"> = {
      approved: "pending",
      rejected: "pending",
      paid: "approved",
    };
    const fromStatus = requiredFromStatus[body.data.status];

    const result = await db.transaction(async (tx) => {
      // Atomic conditional transition: only proceeds if the row is still in the expected
      // prior state, so concurrent admins processing the same request can't double-apply it.
      const [updated] = await tx
        .update(payoutRequestsTable)
        .set({ status: body.data.status, processedAt: new Date() })
        .where(and(eq(payoutRequestsTable.id, params.data.id), eq(payoutRequestsTable.status, fromStatus)))
        .returning();

      if (!updated) return null;

      const amountStr = updated.amount;

      if (body.data.status === "rejected") {
        // Return the reserved amount from pending back to available balance
        await tx
          .update(vendorWalletsTable)
          .set({
            availableBalance: sql`${vendorWalletsTable.availableBalance} + ${amountStr}`,
            pendingBalance: sql`${vendorWalletsTable.pendingBalance} - ${amountStr}`,
          })
          .where(eq(vendorWalletsTable.vendorCompanyId, updated.vendorCompanyId));
      } else if (body.data.status === "paid") {
        // Clear the pending reservation and record the payout transaction
        await tx
          .update(vendorWalletsTable)
          .set({ pendingBalance: sql`${vendorWalletsTable.pendingBalance} - ${amountStr}` })
          .where(eq(vendorWalletsTable.vendorCompanyId, updated.vendorCompanyId));

        await tx.insert(walletTransactionsTable).values({
          vendorCompanyId: updated.vendorCompanyId,
          type: "payout",
          amount: (-Number(amountStr)).toFixed(2),
          description: `Payout #${updated.id} paid out`,
        });
      }

      return updated;
    });

    if (!result) {
      res.status(409).json({ error: "Payout request is not in the expected state for this transition" });
      return;
    }

    const [company] = await db
      .select({ ownerUserId: companiesTable.ownerUserId })
      .from(companiesTable)
      .where(eq(companiesTable.id, result.vendorCompanyId))
      .limit(1);
    if (company?.ownerUserId) {
      await createNotification({
        userId: company.ownerUserId,
        type: "payout_status",
        title: `Payout request ${body.data.status}`,
        message: `Your payout request for ${Number(result.amount).toFixed(2)} was ${body.data.status}.`,
        relatedId: result.id,
      });
    }

    res.json(UpdatePayoutRequestStatusResponse.parse(result));
  },
);

export default router;
