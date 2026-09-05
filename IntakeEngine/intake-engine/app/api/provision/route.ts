import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { sendWelcomeEmail } from "@/lib/email";
import type { FormData } from "@/lib/forms/schema";

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(`provision:${clientIp(req)}`, 10);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.token !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({
    where: { resumeToken: body.token },
    include: { provisionedAccount: true },
  });
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  if (submission.status === "IN_PROGRESS") {
    return NextResponse.json({ error: "Submission must be signed before provisioning" }, { status: 409 });
  }

  if (submission.provisionedAccount) {
    return NextResponse.json({
      accountId: submission.provisionedAccount.id,
      welcomeSent: Boolean(submission.provisionedAccount.welcomeSentAt),
      alreadyProvisioned: true,
    });
  }

  const data = submission.data as FormData;
  const contactEmail = typeof data.contactEmail === "string" ? data.contactEmail : null;
  const businessName = typeof data.businessName === "string" ? data.businessName : "there";

  const account = await prisma.provisionedAccount.create({ data: { submissionId: submission.id } });

  let welcomeSent = false;
  if (contactEmail) {
    welcomeSent = await sendWelcomeEmail(contactEmail, businessName);
    if (welcomeSent) {
      await prisma.provisionedAccount.update({ where: { id: account.id }, data: { welcomeSentAt: new Date() } });
    }
  }

  await prisma.submission.update({ where: { id: submission.id }, data: { status: "PROVISIONED" } });

  logger.info("provision.completed", { submissionId: submission.id, accountId: account.id, welcomeSent });

  return NextResponse.json({ accountId: account.id, welcomeSent, alreadyProvisioned: false });
}
