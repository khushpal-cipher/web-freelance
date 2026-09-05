import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/api";
import { computeReorderRecommendation, DEFAULT_WINDOW_DAYS } from "@/lib/forecast/reorder";

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (limited) return limited;

  const windowDays = Number(req.nextUrl.searchParams.get("windowDays")) || DEFAULT_WINDOW_DAYS;

  const products = await prisma.product.findMany({
    include: { sales: { select: { qty: true, soldAt: true } } },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  const recommendations = products.map(({ sales, ...product }) => ({
    ...product,
    ...computeReorderRecommendation(product, sales, { windowDays, now }),
  }));

  return NextResponse.json(recommendations);
}
