import { pgTable, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const userProfilesTable = pgTable("user_profiles", {
  userId: varchar("user_id").primaryKey(),
  role: varchar("role", { length: 20 }).notNull().default("buyer"), // buyer | vendor | admin
  companyId: integer("company_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserProfile = typeof userProfilesTable.$inferSelect;
export type InsertUserProfile = typeof userProfilesTable.$inferInsert;
export const roleEnum = z.enum(["buyer", "vendor", "admin"]);
