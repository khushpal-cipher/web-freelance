import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  address: z.string().min(1).max(300),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  startAt: z.string().datetime(),
  durationMins: z.number().int().min(5).max(600),
});

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const limit = rateLimit(`jobs:get:${ip}`);
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const jobs = await prisma.job.findMany({
    include: { technician: true },
    orderBy: { startAt: "asc" },
  });
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const limit = rateLimit(`jobs:post:${ip}`);
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const job = await prisma.job.create({
    data: {
      title: parsed.data.title,
      address: parsed.data.address,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      startAt: new Date(parsed.data.startAt),
      durationMins: parsed.data.durationMins,
      status: "UNASSIGNED",
    },
  });

  return NextResponse.json({ job }, { status: 201 });
}
