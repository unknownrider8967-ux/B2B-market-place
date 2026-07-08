import { integer, numeric, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// Generated for buyer companies with credit terms (Net 15/30/60) instead of paying at checkout.
export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 40 }).notNull().unique(),
  orderId: integer("order_id").notNull(),
  buyerCompanyId: integer("buyer_company_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("unpaid"), // unpaid | paid | overdue
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export type Invoice = typeof invoicesTable.$inferSelect;
export const invoiceStatusEnum = z.enum(["unpaid", "paid", "overdue"]);
export const creditTermEnum = z.enum(["none", "net15", "net30", "net60"]);
