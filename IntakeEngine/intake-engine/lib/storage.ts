import { writeFile, readFile, mkdir } from "fs/promises";
import path from "path";

/**
 * Local filesystem storage for signature images, kept outside `public/` so
 * files are only reachable through the signed-URL API route, never directly.
 *
 * ponytail: filesystem, not object storage — fine for a single-instance
 * demo/prototype. Swap for S3/R2 if this needs to survive redeploys or run
 * on serverless (ephemeral disk).
 */
const STORAGE_DIR = path.join(process.cwd(), "storage", "signatures");

export async function saveSignature(submissionId: string, pngBuffer: Buffer): Promise<string> {
  await mkdir(STORAGE_DIR, { recursive: true });
  const filePath = path.join(STORAGE_DIR, `${submissionId}.png`);
  await writeFile(filePath, pngBuffer);
  return filePath;
}

export async function readSignature(submissionId: string): Promise<Buffer> {
  const filePath = path.join(STORAGE_DIR, `${submissionId}.png`);
  return readFile(filePath);
}
