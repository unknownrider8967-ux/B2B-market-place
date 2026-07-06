import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({
  id: true,
  status: true,
  ownerUserId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
