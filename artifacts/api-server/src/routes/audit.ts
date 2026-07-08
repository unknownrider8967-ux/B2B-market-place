import { Router, type IRouter, type Request, type Response } from "express";
import { desc } from "drizzle-orm";
import { db, auditLogsTable } from "@workspace/db";
import { ListAuditLogsQueryParams, ListAuditLogsResponse } from "@workspace/api-zod";
import { getOrCreateProfile } from "../lib/profile";

const router: IRouter = Router();

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  const profile = await getOrCreateProfile(req.user.id);
  if (profile.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

// GET /admin/audit-logs?limit=
router.get("/admin/audit-logs", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const query = ListAuditLogsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(query.data.limit);

  res.json(
    ListAuditLogsResponse.parse(
      rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        action: r.action,
        entityType: r.entityType ?? null,
        entityId: r.entityId ?? null,
        metadata: r.metadata ?? null,
        createdAt: r.createdAt,
      })),
    ),
  );
});

export default router;
