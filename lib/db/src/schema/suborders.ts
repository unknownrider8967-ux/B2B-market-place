import { integer, numeric, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// A parent order is automatically split into one vendor sub-order per vendor. Each sub-order
// doubles as that vendor's purchase order (PO number + acceptance workflow).
export const vendorOrdersTable = pgTable("vendor_orders", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  vendorCompanyId: integer("vendor_company_id").notNull(),
  poNumber: varchar("po_number", { length: 40 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | confirmed | processing | packed | shipped | delivered | completed | cancelled
  poStatus: varchar("po_status", { length: 20 }).notNull().default("pending"), // pending | accepted | rejected
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  shippingZoneId: integer("shipping_zone_id"),
  shippingCost: numeric("shipping_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  trackingNumber: varchar("tracking_number", { length: 60 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type VendorOrder = typeof vendorOrdersTable.$inferSelect;
export const vendorOrderStatusEnum = z.enum([
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
]);
export const poStatusEnum = z.enum(["pending", "accepted", "rejected"]);
