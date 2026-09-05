import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { checkConflict, type ScheduledJob } from "@/lib/scheduling/conflict";
import { getTravelMinutes } from "@/lib/scheduling/travel";
import { sendJobSms } from "@/lib/sms";

const assignSchema = z.object({
  jobId: z.string().min(1),
  technicianId: z.string().min(1),
  force: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const limit = rateLimit(`assign:${ip}`);
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { jobId, technicianId, force } = parsed.data;

  const [job, technician] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    prisma.technician.findUnique({ where: { id: technicianId } }),
  ]);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!technician) return NextResponse.json({ error: "Technician not found" }, { status: 404 });

  const existingJobs = await prisma.job.findMany({
    where: {
      technicianId,
      id: { not: jobId },
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
    },
  });

  const scheduled: ScheduledJob[] = existingJobs.map((j) => ({
    id: j.id,
    lat: j.lat,
    lng: j.lng,
    startAt: j.startAt,
    durationMins: j.durationMins,
  }));

  const result = await checkConflict(
    { lat: job.lat, lng: job.lng, startAt: job.startAt, durationMins: job.durationMins },
    scheduled,
    getTravelMinutes,
  );

  if (result.verdict === "CONFLICT" && !force) {
    return NextResponse.json({ assigned: false, verdict: result.verdict, reasons: result.reasons }, { status: 409 });
  }

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: { technicianId, status: "SCHEDULED" },
  });

  const smsResult = await sendJobSms({
    to: technician.phone,
    optedOut: technician.smsOptOut,
    body: `New job: ${job.title} at ${job.address}, ${job.startAt.toLocaleString()}.`,
  });

  return NextResponse.json({
    assigned: true,
    verdict: result.verdict,
    reasons: result.reasons,
    job: updated,
    sms: smsResult,
  });
}
