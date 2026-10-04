import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    product: "msj",
    architecture: "standalone",
    channels: ["whatsapp", "instagram", "messenger"]
  });
}
