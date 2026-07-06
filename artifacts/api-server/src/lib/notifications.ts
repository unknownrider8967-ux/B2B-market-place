import { db, notificationsTable } from "@workspace/db";

export async function createNotification({
  userId,
  type,
  title,
  message,
  relatedId,
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedId?: number;
}): Promise<void> {
  try {
    await db.insert(notificationsTable).values({ userId, type, title, message, relatedId });
  } catch {
    // Non-critical — never let notification errors break the main flow
  }
}
