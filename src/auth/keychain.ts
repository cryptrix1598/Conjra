import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { hostname } from "node:os";

const SERVICE_NAME = "conjra";
const VAULT_DIR = join(homedir(), ".conjra", "vault");

function getMachineFingerprint(): string {
  const data = `${hostname()}-${process.platform}-${process.arch}-conjra-vault`;
  return createHash("sha256").update(data).digest("hex");
}

function getEncryptionKey(): Buffer {
  const machineId = getMachineFingerprint();
  return scryptSync(machineId, `conjra-salt-${SERVICE_NAME}`, 32);
}

function getVaultPath(provider: string): string {
  return join(VAULT_DIR, `${provider}.enc`);
}

function ensureVaultDir(): void {
  if (!existsSync(VAULT_DIR)) {
    mkdirSync(VAULT_DIR, { recursive: true });
  }
}

function encrypt(data: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function storeCredentials(
  provider: string,
  credentials: Record<string, string>
): Promise<void> {
  ensureVaultDir();
  const data = JSON.stringify(credentials);
  const encrypted = encrypt(data);
  writeFileSync(getVaultPath(provider), encrypted, { encoding: "utf8" });
}

export async function getKeychainCredentials(
  provider: string
): Promise<Record<string, string> | null> {
  const filePath = getVaultPath(provider);
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const encrypted = readFileSync(filePath, { encoding: "utf8" });
    const decrypted = decrypt(encrypted);
    return JSON.parse(decrypted) as Record<string, string>;
  } catch {
    return null;
  }
}

export async function removeCredentials(provider: string): Promise<boolean> {
  const filePath = getVaultPath(provider);
  if (!existsSync(filePath)) {
    return false;
  }

  unlinkSync(filePath);
  return true;
}

export async function listConnectedProviders(): Promise<string[]> {
  if (!existsSync(VAULT_DIR)) {
    return [];
  }

  const files = readdirSync(VAULT_DIR);
  return files
    .filter((f) => f.endsWith(".enc"))
    .map((f) => f.replace(".enc", ""))
    .sort();
}

export function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return "••••••••";
  }
  const prefix = secret.substring(0, 4);
  const suffix = secret.substring(secret.length - 4);
  return `${prefix}${"•".repeat(Math.min(secret.length - 8, 12))}${suffix}`;
}