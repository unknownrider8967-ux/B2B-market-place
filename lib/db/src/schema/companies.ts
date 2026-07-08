import { boolean, integer, numeric, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // "vendor" | "buyer"
  subtype: varchar("subtype", { length: 40 }).notNull(), // manufacturer, distributor, importer, wholesaler, medical_supplier, hospital, clinic, pharmacy, medical_center, doctor, corporate
  registrationNumber: text("registration_number"),
  taxInfo: text("tax_info"),
  address: text("address"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | rejected | suspended
  ownerUserId: varchar("owner_user_id").notNull(),
  // Vendor trust & verification
  verifiedBadge: boolean("verified_badge").notNull().default(false), // admin-granted "Verified Supplier" badge
  // Vendor order rules
  minOrderValue: numeric("min_order_value", { precision: 12, scale: 2 }),
  freeShippingThreshold: numeric("free_shipping_threshold", { precision: 12, scale: 2 }),
  maxOrderQty: integer("max_order_qty"),
  // Buyer credit terms / B2B financing
  creditTerm: varchar("credit_term", { length: 10 }).notNull().default("none"), // none | net15 | net30 | net60
  creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }),
  outstandingBalance: numeric("outstanding_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({
  id: true,
  status: true,
  ownerUserId: true,
  verifiedBadge: true,
  minOrderValue: true,
  freeShippingThreshold: true,
  maxOrderQty: true,
  creditTerm: true,
  creditLimit: true,
  outstandingBalance: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;

export const updateVendorOrderRulesSchema = z.object({
  minOrderValue: z.number().nullable(),
  freeShippingThreshold: z.number().nullable(),
  maxOrderQty: z.number().int().nullable(),
});
export type UpdateVendorOrderRules = z.infer<typeof updateVendorOrderRulesSchema>;

export const updateCreditTermsSchema = z.object({
  creditTerm: z.enum(["none", "net15", "net30", "net60"]),
  creditLimit: z.number().nullable(),
});
export type UpdateCreditTerms = z.infer<typeof updateCreditTermsSchema>;
