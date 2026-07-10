import { Router, type IRouter, type Request, type Response } from "express";
import { db, integrationSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListIntegrationSettingsResponse,
  UpdateIntegrationSettingParams,
  UpdateIntegrationSettingBody,
  UpdateIntegrationSettingResponse,
  DeleteIntegrationSettingParams,
} from "@workspace/api-zod";
import { getOrCreateProfile } from "../lib/profile";
import { encryptSecret, decryptSecret, maskSecret } from "../lib/crypto";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

type Provider = "stripe" | "paypal" | "smtp";

// Which fields each provider supports, and which of those are secrets that must be masked when
// read back and never overwritten by an empty submission.
const PROVIDER_FIELDS: Record<Provider, Record<string, { secret: boolean }>> = {
  stripe: {
    publishableKey: { secret: false },
    secretKey: { secret: true },
    webhookSecret: { secret: true },
  },
  paypal: {
    mode: { secret: false }, // sandbox | live
    clientId: { secret: false },
    clientSecret: { secret: true },
  },
  smtp: {
    host: { secret: false },
    port: { secret: false },
    username: { secret: false },
    password: { secret: true },
    fromEmail: { secret: false },
  },
};

const PROVIDERS = Object.keys(PROVIDER_FIELDS) as Provider[];

async function requireSuperAdmin(req: Request, res: Response): Promise<boolean> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  const profile = await getOrCreateProfile(req.user!.id);
  // Payment/third-party credentials are the most sensitive admin surface in the app — restrict
  // to super_admin (or legacy admins with no adminRole set) rather than any admin sub-role.
  if (profile.role !== "admin" || (profile.adminRole && profile.adminRole !== "super_admin")) {
    res.status(403).json({ error: "Super admin access required" });
    return false;
  }
  return true;
}

function decryptConfig(config: unknown): Record<string, string> {
  if (!config || typeof config !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(config as Record<string, unknown>)) {
    if (typeof value === "string" && value) {
      try {
        result[key] = decryptSecret(value);
      } catch {
        // Ignore fields that fail to decrypt (e.g. stale key) rather than crashing the whole page.
      }
    }
  }
  return result;
}

function maskedFields(provider: Provider, decrypted: Record<string, string>): Record<string, string> {
  const fieldSpec = PROVIDER_FIELDS[provider];
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(decrypted)) {
    if (!(key in fieldSpec) || !value) continue;
    result[key] = fieldSpec[key].secret ? maskSecret(value) : value;
  }
  return result;
}

router.get("/admin/integrations", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireSuperAdmin(req, res))) return;

  const rows = await db.select().from(integrationSettingsTable);
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  const result = PROVIDERS.map((provider) => {
    const row = byProvider.get(provider);
    const decrypted = row ? decryptConfig(row.config) : {};
    return {
      provider,
      enabled: row?.enabled ?? false,
      configured: Object.keys(decrypted).length > 0,
      fields: maskedFields(provider, decrypted),
      updatedAt: row?.updatedAt ?? null,
    };
  });

  res.json(ListIntegrationSettingsResponse.parse(result));
});

router.put("/admin/integrations/:provider", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireSuperAdmin(req, res))) return;

  const params = UpdateIntegrationSettingParams.safeParse(req.params);
  const body = UpdateIntegrationSettingBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: (params.error ?? body.error)!.message });
    return;
  }

  const provider = params.data.provider as Provider;
  const fieldSpec = PROVIDER_FIELDS[provider];

  const [existing] = await db
    .select()
    .from(integrationSettingsTable)
    .where(eq(integrationSettingsTable.provider, provider));
  const current = existing ? decryptConfig(existing.config) : {};

  // Merge: an empty-string field value means "leave the existing stored value untouched" so the
  // admin never has to re-type an unrelated secret just to flip `enabled` or change one field.
  const merged: Record<string, string> = { ...current };
  for (const [key, value] of Object.entries(body.data.fields)) {
    if (!(key in fieldSpec)) continue;
    if (value === "") continue;
    merged[key] = value;
  }

  const encryptedConfig: Record<string, string> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (key in fieldSpec && value) {
      encryptedConfig[key] = encryptSecret(value);
    }
  }

  const [saved] = await db
    .insert(integrationSettingsTable)
    .values({
      provider,
      enabled: body.data.enabled,
      config: encryptedConfig,
      updatedBy: req.user!.id,
    })
    .onConflictDoUpdate({
      target: integrationSettingsTable.provider,
      set: { enabled: body.data.enabled, config: encryptedConfig, updatedBy: req.user!.id, updatedAt: new Date() },
    })
    .returning();

  await logAudit({
    userId: req.user!.id,
    action: "integration_settings_update",
    entityType: "integration",
    metadata: { provider, enabled: body.data.enabled, fieldsChanged: Object.keys(body.data.fields).filter((k) => body.data.fields[k] !== "") },
  });

  res.json(
    UpdateIntegrationSettingResponse.parse({
      provider,
      enabled: saved.enabled,
      configured: Object.keys(merged).length > 0,
      fields: maskedFields(provider, merged),
      updatedAt: saved.updatedAt,
    }),
  );
});

router.delete("/admin/integrations/:provider", async (req: Request, res: Response): Promise<void> => {
  if (!(await requireSuperAdmin(req, res))) return;

  const params = DeleteIntegrationSettingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(integrationSettingsTable).where(eq(integrationSettingsTable.provider, params.data.provider));

  await logAudit({
    userId: req.user!.id,
    action: "integration_settings_delete",
    entityType: "integration",
    metadata: { provider: params.data.provider },
  });

  res.status(204).send();
});

export default router;
