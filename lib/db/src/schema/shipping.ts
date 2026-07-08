import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Vendor-defined shipping zones used to price and estimate delivery for sub-orders.
export const shippingZonesTable = pgTable("shipping_zones", {
  id: serial("id").primaryKey(),
  vendorCompanyId: integer("vendor_company_id").notNull(),
  name: text("name").notNull(), // e.g. "Local", "National", "International"
  regions: text("regions").notNull(), // comma-separated region/city list
  rate: numeric("rate", { precision: 12, scale: 2 }).notNull().default("0"),
  etaDays: integer("eta_days").notNull().default(3),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShippingZoneSchema = createInsertSchema(shippingZonesTable).omit({
  id: true,
  vendorCompanyId: true,
  createdAt: true,
});
export type InsertShippingZone = z.infer<typeof insertShippingZoneSchema>;
export type ShippingZone = typeof shippingZonesTable.$inferSelect;
