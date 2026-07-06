import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cartItemsTable = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  offerId: integer("offer_id").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCartItemSchema = createInsertSchema(cartItemsTable).omit({
  id: true,
  userId: true,
  createdAt: true,
});
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItemsTable.$inferSelect;
