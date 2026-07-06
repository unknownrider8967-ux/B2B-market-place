import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const wishlistsTable = pgTable("wishlists", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  productId: integer("product_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Wishlist = typeof wishlistsTable.$inferSelect;
export type InsertWishlist = typeof wishlistsTable.$inferInsert;
