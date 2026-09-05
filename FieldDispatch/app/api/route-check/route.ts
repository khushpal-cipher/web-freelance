import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { checkConflict, type ScheduledJob } from "@/lib/scheduling/conflict";
import { getTravelMinutes } from "@/lib/scheduling/travel";

const querySchema = z.object({
  technicianId: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  startAt: z.string().datetime(),
  durationMins: z.coerce.number().int().min(5).max(600),
  excludeJobId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const limit = rateLimit(`route-check:${ip}`);
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { technicianId, lat, lng, startAt, durationMins, excludeJobId } = parsed.data;

  const existingJobs = await prisma.job.findMany({
    where: {
      technicianId,
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      ...(excludeJobId ? { id: { not: excludeJobId } } : {}),
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
    { lat, lng, startAt: new Date(startAt), durationMins },
    scheduled,
    getTravelMinutes,
  );

  return NextResponse.json(result);
}
