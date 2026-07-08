import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Suggested alternative for a product, e.g. when a vendor is out of stock or an RFQ item is
// unavailable. Vendors propose substitutes; buyers see them on the product page / RFQ response.
export const productSubstitutesTable = pgTable("product_substitutes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  substituteProductId: integer("substitute_product_id").notNull(),
  suggestedByVendorId: integer("suggested_by_vendor_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSubstituteSchema = createInsertSchema(productSubstitutesTable).omit({
  id: true,
  suggestedByVendorId: true,
  createdAt: true,
});
export type InsertProductSubstitute = z.infer<typeof insertProductSubstituteSchema>;
export type ProductSubstitute = typeof productSubstitutesTable.$inferSelect;
