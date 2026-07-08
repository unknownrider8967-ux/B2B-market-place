import { boolean, numeric, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Admin-configurable commission percentage, keyed by vendor subtype (manufacturer, distributor, ...)
// or a named tier ("preferred_vendor", "competitive_pricing_vendor"). The first active rule matching
// the vendor's subtype/tier is used; falls back to the row with isDefault = true.
export const commissionRulesTable = pgTable("commission_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  vendorSubtype: varchar("vendor_subtype", { length: 40 }), // null = applies by tier only
  tier: varchar("tier", { length: 40 }), // e.g. standard, preferred, manufacturer, competitive_pricing
  percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCommissionRuleSchema = createInsertSchema(commissionRulesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCommissionRule = z.infer<typeof insertCommissionRuleSchema>;
export type CommissionRule = typeof commissionRulesTable.$inferSelect;
