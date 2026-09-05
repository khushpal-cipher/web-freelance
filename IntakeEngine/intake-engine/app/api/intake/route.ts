import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  intakeSchema,
  getStep,
  zodForStep,
  nextStepId,
  progress,
  type FormData,
} from "@/lib/forms/schema";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const submission = await prisma.submission.findUnique({ where: { resumeToken: token } });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    token: submission.resumeToken,
    currentStep: submission.currentStep,
    data: submission.data,
    status: submission.status,
    progress: progress(intakeSchema, submission.currentStep, submission.data as FormData),
  });
}

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(`intake:${clientIp(req)}`, 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.stepId !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const step = getStep(intakeSchema, body.stepId);
  if (!step) return NextResponse.json({ error: "Unknown step" }, { status: 400 });

  let submission = body.token
    ? await prisma.submission.findUnique({ where: { resumeToken: body.token } })
    : null;

  if (body.token && !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const existingData = (submission?.data as FormData) ?? {};

  const stepSchema = zodForStep(step, existingData);
  const parsed = stepSchema.safeParse(body.data ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  }

  const mergedData: FormData = { ...existingData, ...parsed.data };
  const next = nextStepId(intakeSchema, step.id, mergedData);
  const newCurrentStep = next ?? step.id;

  if (!submission) {
    submission = await prisma.submission.create({
      data: { data: mergedData, currentStep: newCurrentStep },
    });
    logger.info("intake.created", { submissionId: submission.id, step: step.id });
  } else {
    submission = await prisma.submission.update({
      where: { id: submission.id },
      data: { data: mergedData, currentStep: newCurrentStep },
    });
    logger.info("intake.updated", { submissionId: submission.id, step: step.id });
  }

  return NextResponse.json({
    token: submission.resumeToken,
    nextStep: newCurrentStep,
    complete: next === null,
    progress: progress(intakeSchema, newCurrentStep, mergedData),
  });
}
