/**
 * Offline credential verification using PBKDF2-SHA-256 (WebCrypto).
 *
 * After a successful online sign-in we derive a one-way key from the
 * user's password and store it locally. When the device is offline and
 * the user needs to re-authenticate (e.g. after an auto sign-out), we
 * derive the key again from what they typed and compare — no plaintext
 * password is ever stored.
 *
 * Security properties:
 *   - 100,000 PBKDF2-SHA-256 iterations (OWASP minimum)
 *   - Salt = lowercased email (stable, user-specific)
 *   - 256-bit output, hex-encoded
 *   - Constant-time comparison to prevent timing attacks
 */

const STORAGE_KEY = "meatlens-offline-cred";
const ITERATIONS = 100_000;

async function deriveHash(email: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(email.toLowerCase()),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string comparison (prevents timing attacks). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export interface StoredCred {
  email: string;
  hash: string;
  isAdmin: boolean;
}

/**
 * Call after a successful online sign-in to enable offline re-authentication.
 */
export async function storeOfflineCredential(
  email: string,
  password: string,
  isAdmin: boolean,
): Promise<void> {
  const hash = await deriveHash(email, password);
  const entry: StoredCred = { email: email.toLowerCase(), hash, isAdmin };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
}

/**
 * Verify typed credentials against the stored offline hash.
 * Returns `{ valid: true, isAdmin }` on match, `{ valid: false }` otherwise.
 */
export async function verifyOfflineCredential(
  email: string,
  password: string,
): Promise<{ valid: boolean; isAdmin: boolean }> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { valid: false, isAdmin: false };
  try {
    const stored: StoredCred = JSON.parse(raw);
    if (email.toLowerCase() !== stored.email) return { valid: false, isAdmin: false };
    const inputHash = await deriveHash(email, password);
    const valid = safeEqual(inputHash, stored.hash);
    return { valid, isAdmin: valid ? (stored.isAdmin ?? false) : false };
  } catch {
    return { valid: false, isAdmin: false };
  }
}

export function clearOfflineCredential(): void {
  localStorage.removeItem(STORAGE_KEY);
}
