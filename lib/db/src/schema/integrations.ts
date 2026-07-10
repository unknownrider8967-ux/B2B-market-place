import { boolean, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Stores admin-managed third-party integration configuration (payment gateways, email/SMS
// providers, etc). Secret-like field values are AES-256-GCM encrypted at rest (see
// lib/crypto.ts in the API server) — this table never stores plaintext secrets.
export const integrationSettingsTable = pgTable("integration_settings", {
  provider: varchar("provider", { length: 40 }).primaryKey(), // "stripe" | "paypal" | "smtp"
  enabled: boolean("enabled").notNull().default(false),
  // Map of field name -> encrypted value, e.g. { secretKey: "<enc>", publishableKey: "<enc>" }
  config: jsonb("config").notNull().default({}),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type IntegrationSetting = typeof integrationSettingsTable.$inferSelect;
