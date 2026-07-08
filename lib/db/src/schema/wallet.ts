import { integer, numeric, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vendorWalletsTable = pgTable("vendor_wallets", {
  id: serial("id").primaryKey(),
  vendorCompanyId: integer("vendor_company_id").notNull().unique(),
  availableBalance: numeric("available_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  pendingBalance: numeric("pending_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export type VendorWallet = typeof vendorWalletsTable.$inferSelect;

export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  vendorCompanyId: integer("vendor_company_id").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // sale | commission | payout | adjustment
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), // negative for deductions
  relatedOrderId: integer("related_order_id"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;

export const payoutRequestsTable = pgTable("payout_requests", {
  id: serial("id").primaryKey(),
  vendorCompanyId: integer("vendor_company_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | rejected | paid
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export const insertPayoutRequestSchema = createInsertSchema(payoutRequestsTable).omit({
  id: true,
  vendorCompanyId: true,
  status: true,
  adminNote: true,
  createdAt: true,
  processedAt: true,
});
export type InsertPayoutRequest = z.infer<typeof insertPayoutRequestSchema>;
export type PayoutRequest = typeof payoutRequestsTable.$inferSelect;
export const payoutStatusEnum = z.enum(["pending", "approved", "rejected", "paid"]);
