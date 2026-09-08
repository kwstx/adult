/**
 * ============================================================================
 * AUTHORITATIVE FIELD-LEVEL ENCRYPTION (AES-256-GCM)
 * ============================================================================
 * Cryptographically protects sensitive PII, Government IDs, Passports, Tax IDs,
 * and banking records at rest in the database using authenticated AES-256-GCM.
 * 
 * Format: `v1:<hex_iv>:<hex_tag>:<base64_ciphertext>`
 */

import * as crypto from "crypto";

const MASTER_ENCRYPTION_KEY =
  process.env.FIELD_ENCRYPTION_KEY ||
  process.env.COMPLIANCE_STORAGE_ENCRYPTION_KEY ||
  "platform_prod_field_level_encryption_master_key_2026";

export class FieldEncryption {
  private static readonly CURRENT_VERSION = "v1";

  private static deriveKey(customKey?: string): Buffer {
    const rawKey = customKey || MASTER_ENCRYPTION_KEY;
    return crypto.createHash("sha256").update(rawKey).digest();
  }

  /**
   * Encrypts plaintext string into versioned authenticated AES-256-GCM ciphertext.
   */
  public static encrypt(plaintext: string, customKey?: string): string {
    if (!plaintext) return plaintext;

    const iv = crypto.randomBytes(12);
    const key = FieldEncryption.deriveKey(customKey);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    let ciphertext = cipher.update(plaintext, "utf-8", "base64");
    ciphertext += cipher.final("base64");
    const authTag = cipher.getAuthTag().toString("hex");

    return `${FieldEncryption.CURRENT_VERSION}:${iv.toString("hex")}:${authTag}:${ciphertext}`;
  }

  /**
   * Decrypts versioned authenticated ciphertext back into plaintext.
   */
  public static decrypt(cipherString: string, customKey?: string): string {
    if (!cipherString || typeof cipherString !== "string") return cipherString;

    // Check if string matches encryption envelope format
    const parts = cipherString.split(":");
    if (parts.length !== 4) {
      return cipherString; // Plaintext or unencrypted fallback
    }

    const [version, ivHex, authTagHex, ciphertextBase64] = parts;
    if (version !== "v1") {
      throw new Error(`Unsupported encryption version: ${version}`);
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = FieldEncryption.deriveKey(customKey);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextBase64, "base64", "utf-8");
    decrypted += decipher.final("utf-8");

    return decrypted;
  }

  /**
   * Checks if a string value is encrypted.
   */
  public static isEncrypted(value: string): boolean {
    if (!value || typeof value !== "string") return false;
    const parts = value.split(":");
    return parts.length === 4 && parts[0] === "v1" && parts[1].length === 24 && parts[2].length === 32;
  }
}
