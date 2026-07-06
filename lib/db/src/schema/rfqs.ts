import { integer, numeric, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rfqsTable = pgTable("rfqs", {
  id: serial("id").primaryKey(),
  buyerUserId: varchar("buyer_user_id").notNull(),
  buyerCompanyId: integer("buyer_company_id"),
  productId: integer("product_id"),
  title: text("title").notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("open"), // open | closed
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRfqSchema = createInsertSchema(rfqsTable).omit({
  id: true,
  buyerUserId: true,
  buyerCompanyId: true,
  status: true,
  createdAt: true,
});
export type InsertRfq = z.infer<typeof insertRfqSchema>;
export type Rfq = typeof rfqsTable.$inferSelect;

export const rfqResponsesTable = pgTable("rfq_responses", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfq_id").notNull(),
  vendorCompanyId: integer("vendor_company_id").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  leadTimeDays: integer("lead_time_days").notNull(),
  terms: text("terms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRfqResponseSchema = createInsertSchema(rfqResponsesTable).omit({
  id: true,
  vendorCompanyId: true,
  createdAt: true,
});
export type InsertRfqResponse = z.infer<typeof insertRfqResponseSchema>;
export type RfqResponse = typeof rfqResponsesTable.$inferSelect;
