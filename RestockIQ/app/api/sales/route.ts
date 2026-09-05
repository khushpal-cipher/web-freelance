import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saleCreateSchema } from "@/lib/validation";
import { checkRateLimit, jsonError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (limited) return limited;

  const productId = req.nextUrl.searchParams.get("productId") ?? undefined;
  const sales = await prisma.saleRecord.findMany({
    where: productId ? { productId } : undefined,
    orderBy: { soldAt: "desc" },
    take: 500,
  });
  return NextResponse.json(sales);
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = saleCreateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues.map((i) => i.message).join(", "), 400);

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return jsonError("Product not found", 404);

  const sale = await prisma.saleRecord.create({
    data: { ...parsed.data, soldAt: parsed.data.soldAt ?? new Date() },
  });
  return NextResponse.json(sale, { status: 201 });
}
