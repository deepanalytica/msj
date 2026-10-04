const encoder = new TextEncoder();

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return hex(new Uint8Array(signature));
}

export async function verifySignatureHeader(
  secret: string,
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const supplied = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;
  const expected = await hmacSha256Hex(secret, rawBody);
  return constantTimeEqual(expected, supplied.toLowerCase());
}

function decodeAesKey(base64Key: string): ArrayBuffer {
  const bytes = Buffer.from(base64Key, "base64");
  if (bytes.byteLength !== 32) {
    throw new Error("MSJ_CREDENTIALS_KEY must contain exactly 32 bytes encoded as base64.");
  }
  const key = new ArrayBuffer(32);
  new Uint8Array(key).set(bytes);
  return key;
}

async function importAesKey(base64Key: string, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", decodeAesKey(base64Key), { name: "AES-GCM" }, false, usages);
}

export async function encryptSecret(plaintext: string, base64Key: string) {
  const key = await importAesKey(base64Key, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
  return {
    ciphertext: Buffer.from(encrypted).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
  };
}

export async function decryptSecret(ciphertext: string, iv: string, base64Key: string) {
  const key = await importAesKey(base64Key, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(Buffer.from(iv, "base64")) },
    key,
    new Uint8Array(Buffer.from(ciphertext, "base64")),
  );
  return new TextDecoder().decode(decrypted);
}
