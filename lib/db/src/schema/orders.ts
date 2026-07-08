import { integer, numeric, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerUserId: varchar("buyer_user_id").notNull(),
  buyerCompanyId: integer("buyer_company_id"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | confirmed | shipped | completed | cancelled
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  couponCode: varchar("coupon_code", { length: 40 }),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  shippingCost: numeric("shipping_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Order = typeof ordersTable.$inferSelect;

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  offerId: integer("offer_id").notNull(),
  productId: integer("product_id").notNull(),
  vendorCompanyId: integer("vendor_company_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
});

export type OrderItem = typeof orderItemsTable.$inferSelect;

export const orderStatusEnum = z.enum(["pending", "confirmed", "shipped", "completed", "cancelled"]);
