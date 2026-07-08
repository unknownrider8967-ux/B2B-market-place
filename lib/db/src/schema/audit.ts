import { integer, jsonb, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

// System-wide audit trail for sensitive admin/security-relevant actions.
export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  action: varchar("action", { length: 80 }).notNull(), // e.g. company_status_change, commission_rule_update, login
  entityType: varchar("entity_type", { length: 40 }),
  entityId: integer("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
export type InsertAuditLog = typeof auditLogsTable.$inferInsert;
