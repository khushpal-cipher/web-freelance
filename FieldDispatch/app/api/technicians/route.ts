import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const technicians = await prisma.technician.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ technicians });
}
