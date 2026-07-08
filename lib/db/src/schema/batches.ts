import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Medical batch/lot tracking per vendor offer. Supports expiry alerts and FEFO (first-expiry-first-out).
export const productBatchesTable = pgTable("product_batches", {
  id: serial("id").primaryKey(),
  vendorOfferId: integer("vendor_offer_id").notNull(),
  batchNumber: text("batch_number").notNull(),
  lotNumber: text("lot_number"),
  quantity: integer("quantity").notNull(),
  manufactureDate: timestamp("manufacture_date", { withTimezone: true }),
  expiryDate: timestamp("expiry_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductBatchSchema = createInsertSchema(productBatchesTable, {
  manufactureDate: z.coerce.date().nullable().optional(),
  expiryDate: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
});
export type InsertProductBatch = z.infer<typeof insertProductBatchSchema>;
export type ProductBatch = typeof productBatchesTable.$inferSelect;
