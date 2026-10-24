import { NextResponse } from "next/server";
import { providerFlags } from "@/lib/auth/oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(providerFlags());
}
