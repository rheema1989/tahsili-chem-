import { NextResponse } from "next/server";
import { ensureSeeded } from "@/db/seed";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
