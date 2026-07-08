import { pgTable, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const userProfilesTable = pgTable("user_profiles", {
  userId: varchar("user_id").primaryKey(),
  role: varchar("role", { length: 20 }).notNull().default("buyer"), // buyer | vendor | admin
  companyId: integer("company_id"),
  // Only meaningful when role = "admin". Grants module-scoped permissions; super_admin has all.
  adminRole: varchar("admin_role", { length: 30 }), // super_admin | operations_manager | finance_manager | product_manager | customer_support | procurement_manager
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserProfile = typeof userProfilesTable.$inferSelect;
export type InsertUserProfile = typeof userProfilesTable.$inferInsert;
export const roleEnum = z.enum(["buyer", "vendor", "admin"]);
export const adminRoleEnum = z.enum([
  "super_admin",
  "operations_manager",
  "finance_manager",
  "product_manager",
  "customer_support",
  "procurement_manager",
]);

// Which admin modules each admin sub-role may access. super_admin (or a profile with no adminRole
// set, for backward compatibility with existing admins) has access to everything.
export const ADMIN_MODULE_PERMISSIONS: Record<string, readonly string[]> = {
  super_admin: ["users", "vendors", "products", "orders", "finance", "procurement", "support", "cms", "compliance"],
  operations_manager: ["users", "vendors", "products", "orders", "procurement"],
  finance_manager: ["orders", "finance"],
  product_manager: ["products", "compliance"],
  customer_support: ["users", "orders", "support"],
  procurement_manager: ["orders", "procurement", "vendors"],
};
