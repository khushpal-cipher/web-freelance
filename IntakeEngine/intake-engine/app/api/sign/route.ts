import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { saveSignature } from "@/lib/storage";

const DATA_URL_RE = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/;
const MAX_SIGNATURE_BYTES = 500_000;

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(`sign:${clientIp(req)}`, 10);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.token !== "string" || typeof body.signatureDataUrl !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const match = DATA_URL_RE.exec(body.signatureDataUrl);
  if (!match) return NextResponse.json({ error: "Signature must be a PNG data URL" }, { status: 422 });

  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length === 0 || buffer.length > MAX_SIGNATURE_BYTES) {
    return NextResponse.json({ error: "Signature image is empty or too large" }, { status: 422 });
  }

  const submission = await prisma.submission.findUnique({ where: { resumeToken: body.token } });
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  if (submission.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Submission already signed" }, { status: 409 });
  }

  await saveSignature(submission.id, buffer);

  const updated = await prisma.submission.update({
    where: { id: submission.id },
    data: { status: "SIGNED", signedAt: new Date(), signatureUrl: `/api/signature/${submission.id}` },
  });

  logger.info("sign.completed", { submissionId: submission.id });

  return NextResponse.json({ token: updated.resumeToken, signedAt: updated.signedAt, status: updated.status });
}
