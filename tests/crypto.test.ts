import { describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  hmacSha256Hex,
  verifySignatureHeader,
} from "@/services/crypto";

describe("MSJ cryptography", () => {
  it("verifies signed internal payloads", async () => {
    const body = '{"event":"message"}';
    const signature = await hmacSha256Hex("secret", body);
    await expect(verifySignatureHeader("secret", body, `sha256=${signature}`)).resolves.toBe(true);
    await expect(verifySignatureHeader("wrong", body, `sha256=${signature}`)).resolves.toBe(false);
  });

  it("encrypts access tokens with AES-256-GCM", async () => {
    const key = Buffer.alloc(32, 9).toString("base64");
    const encrypted = await encryptSecret("meta-secret-token", key);
    expect(encrypted.ciphertext).not.toContain("meta-secret-token");
    await expect(decryptSecret(encrypted.ciphertext, encrypted.iv, key)).resolves.toBe("meta-secret-token");
  });
});
