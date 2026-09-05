import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { productUpdateSchema } from "@/lib/validation";
import { checkRateLimit, jsonError } from "@/lib/api";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = checkRateLimit(req);
  if (limited) return limited;

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return jsonError("Product not found", 404);
  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = checkRateLimit(req);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues.map((i) => i.message).join(", "), 400);

  const product = await prisma.product
    .update({ where: { id: params.id }, data: parsed.data })
    .catch(() => null);
  if (!product) return jsonError("Product not found", 404);
  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = checkRateLimit(req);
  if (limited) return limited;

  const deleted = await prisma.product.delete({ where: { id: params.id } }).catch(() => null);
  if (!deleted) return jsonError("Product not found", 404);
  return NextResponse.json({ ok: true });
}
