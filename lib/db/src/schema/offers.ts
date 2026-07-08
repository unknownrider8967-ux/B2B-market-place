import { integer, jsonb, numeric, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface PriceTier {
  minQty: number;
  maxQty: number | null;
  price: number;
}

export const vendorOffersTable = pgTable("vendor_offers", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  variantId: integer("variant_id"),
  vendorCompanyId: integer("vendor_company_id").notNull(),
  warehouseId: integer("warehouse_id"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  moq: integer("moq").notNull().default(1),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  deliveryDays: integer("delivery_days").notNull().default(3),
  priceTiers: jsonb("price_tiers").$type<PriceTier[]>().notNull().default([]),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active | inactive
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVendorOfferSchema = createInsertSchema(vendorOffersTable, {
  priceTiers: z.array(
    z.object({
      minQty: z.number(),
      maxQty: z.number().nullable(),
      price: z.number(),
    }),
  ),
}).omit({
  id: true,
  vendorCompanyId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVendorOffer = z.infer<typeof insertVendorOfferSchema>;
export type VendorOffer = typeof vendorOffersTable.$inferSelect;
