import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Vendors may operate multiple warehouses; each vendor offer is fulfilled from one warehouse.
export const warehousesTable = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  vendorCompanyId: integer("vendor_company_id").notNull(),
  name: text("name").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWarehouseSchema = createInsertSchema(warehousesTable).omit({
  id: true,
  vendorCompanyId: true,
  createdAt: true,
});
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type Warehouse = typeof warehousesTable.$inferSelect;
