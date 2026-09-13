import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { detectHazardAlerts } from "@/lib/hazard";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await detectHazardAlerts(session.user.id);

  return NextResponse.json({ alerts });
}