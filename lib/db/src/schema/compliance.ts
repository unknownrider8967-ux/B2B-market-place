import { integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// FDA | CE | ISO | GMP certificates uploaded by vendors (company-level) or attached to a specific product.
export const complianceCertificatesTable = pgTable("compliance_certificates", {
  id: serial("id").primaryKey(),
  vendorCompanyId: integer("vendor_company_id").notNull(),
  productId: integer("product_id"), // null = company-wide certificate
  type: varchar("type", { length: 20 }).notNull(), // fda | ce | iso | gmp
  certificateNumber: text("certificate_number").notNull(),
  fileUrl: text("file_url"),
  issueDate: timestamp("issue_date", { withTimezone: true }),
  expiryDate: timestamp("expiry_date", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | rejected | expired
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertComplianceCertificateSchema = createInsertSchema(complianceCertificatesTable, {
  issueDate: z.coerce.date().nullable().optional(),
  expiryDate: z.coerce.date(),
}).omit({
  id: true,
  vendorCompanyId: true,
  status: true,
  adminNote: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertComplianceCertificate = z.infer<typeof insertComplianceCertificateSchema>;
export type ComplianceCertificate = typeof complianceCertificatesTable.$inferSelect;
export const complianceCertificateTypeEnum = z.enum(["fda", "ce", "iso", "gmp"]);
export const complianceCertificateStatusEnum = z.enum(["pending", "approved", "rejected", "expired"]);
