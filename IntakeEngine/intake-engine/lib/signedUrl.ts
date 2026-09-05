import { createHmac, timingSafeEqual } from "crypto";

/**
 * HMAC-signed, expiring URLs for serving stored signature images without
 * making the signature endpoint publicly guessable/enumerable.
 */
const SECRET = process.env.SIGNING_SECRET ?? "dev-signing-secret-change-me";

export function signPath(path: string, expiresInSeconds = 900): { expires: number; signature: string } {
  const expires = Date.now() + expiresInSeconds * 1000;
  const signature = createHmac("sha256", SECRET).update(`${path}:${expires}`).digest("hex");
  return { expires, signature };
}

export function verifySignedPath(path: string, expires: string | null, signature: string | null): boolean {
  if (!expires || !signature) return false;
  if (Date.now() > Number(expires)) return false;
  const expected = createHmac("sha256", SECRET).update(`${path}:${expires}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
