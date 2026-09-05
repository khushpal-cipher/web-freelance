import { NextRequest, NextResponse } from "next/server";
import { verifySignedPath } from "@/lib/signedUrl";
import { readSignature } from "@/lib/storage";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const expires = req.nextUrl.searchParams.get("expires");
  const signature = req.nextUrl.searchParams.get("sig");
  const path = `/api/signature/${params.id}`;

  if (!verifySignedPath(path, expires, signature)) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }

  try {
    const buffer = await readSignature(params.id);
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
