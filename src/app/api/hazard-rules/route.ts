import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DEFAULT_HAZARD_RULES, type HazardRuleData } from "@/lib/hazard";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rule = await prisma.hazardRule.findUnique({
    where: { userId: session.user.id },
  });

  if (!rule) {
    return NextResponse.json({ ...DEFAULT_HAZARD_RULES, hasCustomRules: false });
  }

  return NextResponse.json({
    runawayEnabled: rule.runawayEnabled,
    runawayMaxRequests: rule.runawayMaxRequests,
    runawayMaxTokens: rule.runawayMaxTokens,
    highCostEnabled: rule.highCostEnabled,
    highCostThreshold: rule.highCostThreshold,
    spikeEnabled: rule.spikeEnabled,
    spikeFactor: rule.spikeFactor,
    hasCustomRules: true,
  });
}

export async function PUT(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<HazardRuleData>;

  const data: HazardRuleData = {
    runawayEnabled: body.runawayEnabled ?? DEFAULT_HAZARD_RULES.runawayEnabled,
    runawayMaxRequests: clamp(body.runawayMaxRequests, 1, 10000, DEFAULT_HAZARD_RULES.runawayMaxRequests),
    runawayMaxTokens: clamp(body.runawayMaxTokens, 1000, 100000000, DEFAULT_HAZARD_RULES.runawayMaxTokens),
    highCostEnabled: body.highCostEnabled ?? DEFAULT_HAZARD_RULES.highCostEnabled,
    highCostThreshold: clamp(body.highCostThreshold, 0.0001, 10000, DEFAULT_HAZARD_RULES.highCostThreshold),
    spikeEnabled: body.spikeEnabled ?? DEFAULT_HAZARD_RULES.spikeEnabled,
    spikeFactor: clamp(body.spikeFactor, 1.1, 100, DEFAULT_HAZARD_RULES.spikeFactor),
  };

  const rule = await prisma.hazardRule.upsert({
    where: { userId: session.user.id },
    update: data,
    create: {
      userId: session.user.id,
      ...data,
    },
  });

  return NextResponse.json({
    ...data,
    hasCustomRules: true,
    id: rule.id,
  });
}

function clamp(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}