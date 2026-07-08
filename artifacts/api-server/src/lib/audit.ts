import { db, auditLogsTable } from "@workspace/db";

interface LogAuditParams {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: number;
  metadata?: Record<string, unknown>;
}

export async function logAudit({ userId, action, entityType, entityId, metadata }: LogAuditParams): Promise<void> {
  await db.insert(auditLogsTable).values({
    userId,
    action,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    metadata: metadata ?? null,
  });
}
