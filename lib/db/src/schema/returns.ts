import { integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const returnsTable = pgTable("returns", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  orderItemId: integer("order_item_id").notNull(),
  buyerUserId: varchar("buyer_user_id").notNull(),
  buyerCompanyId: integer("buyer_company_id"),
  vendorCompanyId: integer("vendor_company_id").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // damaged | missing | wrong_item | other
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("requested"), // requested | under_review | approved | rejected | refunded
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReturnSchema = createInsertSchema(returnsTable).omit({
  id: true,
  buyerUserId: true,
  buyerCompanyId: true,
  vendorCompanyId: true,
  status: true,
  adminNote: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReturn = z.infer<typeof insertReturnSchema>;
export type Return = typeof returnsTable.$inferSelect;
export const returnTypeEnum = z.enum(["damaged", "missing", "wrong_item", "other"]);
export const returnStatusEnum = z.enum(["requested", "under_review", "approved", "rejected", "refunded"]);
