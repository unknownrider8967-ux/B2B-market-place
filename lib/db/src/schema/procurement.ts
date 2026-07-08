import { integer, jsonb, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface ApprovalStep {
  role: "department_manager" | "procurement_manager" | "finance_manager";
  order: number;
}

// Per-buyer-company configurable approval chain. If none exists, orders skip approval.
export const approvalChainsTable = pgTable("approval_chains", {
  id: serial("id").primaryKey(),
  buyerCompanyId: integer("buyer_company_id").notNull(),
  steps: jsonb("steps").$type<ApprovalStep[]>().notNull().default([]),
  isActive: varchar("is_active", { length: 5 }).notNull().default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertApprovalChainSchema = createInsertSchema(approvalChainsTable, {
  steps: z.array(
    z.object({
      role: z.enum(["department_manager", "procurement_manager", "finance_manager"]),
      order: z.number(),
    }),
  ),
}).omit({
  id: true,
  buyerCompanyId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertApprovalChain = z.infer<typeof insertApprovalChainSchema>;
export type ApprovalChain = typeof approvalChainsTable.$inferSelect;

export interface ApprovalLogEntry {
  step: string;
  userId: string;
  decision: "approved" | "rejected";
  note?: string;
  decidedAt: string;
}

// One request per order that requires approval before purchase orders are issued.
export const approvalRequestsTable = pgTable("approval_requests", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  buyerCompanyId: integer("buyer_company_id").notNull(),
  steps: jsonb("steps").$type<ApprovalStep[]>().notNull().default([]),
  currentStepIndex: integer("current_step_index").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | rejected
  log: jsonb("log").$type<ApprovalLogEntry[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ApprovalRequest = typeof approvalRequestsTable.$inferSelect;
export const approvalRequestStatusEnum = z.enum(["pending", "approved", "rejected"]);
