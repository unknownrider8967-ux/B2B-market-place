import crypto from "node:crypto";

// Encrypts third-party integration secrets (Stripe/PayPal keys, SMTP credentials, etc.) before
// they are stored in the database, so the DB never holds plaintext API keys. The key is derived
// from SESSION_SECRET (already a required, securely-managed Replit secret) rather than asking
// for a second secret just for this.
function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be set to encrypt/decrypt integration settings.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted payload");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}

// Masks a decrypted secret for display in the admin UI — never send full values back to the browser.
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 4) return "••••";
  return `••••${plaintext.slice(-4)}`;
}
