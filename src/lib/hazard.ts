import { prisma } from "@/lib/prisma";

export interface HazardRuleData {
  runawayEnabled: boolean;
  runawayMaxRequests: number;
  runawayMaxTokens: number;
  highCostEnabled: boolean;
  highCostThreshold: number;
  spikeEnabled: boolean;
  spikeFactor: number;
}

export interface HazardAlert {
  type: "runaway" | "highcost" | "spike";
  severity: "warning" | "critical";
  title: string;
  message: string;
  details: Record<string, string | number>;
}

export const DEFAULT_HAZARD_RULES: HazardRuleData = {
  runawayEnabled: true,
  runawayMaxRequests: 50,
  runawayMaxTokens: 500000,
  highCostEnabled: true,
  highCostThreshold: 1.0,
  spikeEnabled: true,
  spikeFactor: 3.0,
};

export async function getHazardRules(userId: string): Promise<HazardRuleData> {
  const rule = await prisma.hazardRule.findUnique({ where: { userId } });
  if (!rule) return DEFAULT_HAZARD_RULES;
  return {
    runawayEnabled: rule.runawayEnabled,
    runawayMaxRequests: rule.runawayMaxRequests,
    runawayMaxTokens: rule.runawayMaxTokens,
    highCostEnabled: rule.highCostEnabled,
    highCostThreshold: rule.highCostThreshold,
    spikeEnabled: rule.spikeEnabled,
    spikeFactor: rule.spikeFactor,
  };
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export async function detectHazardAlerts(userId: string): Promise<HazardAlert[]> {
  const rules = await getHazardRules(userId);
  const alerts: HazardAlert[] = [];

  // --- Runaway / loop detection: rolling 5 minute window ---
  if (rules.runawayEnabled) {
    const fiveMinAgo = new Date(Date.now() - 5 * MINUTE);
    const recent = await prisma.request.aggregate({
      where: {
        userId,
        timestamp: { gte: fiveMinAgo },
      },
      _count: true,
      _sum: { totalTokens: true },
    });

    const count = recent._count;
    const tokens = recent._sum.totalTokens || 0;

    if (count >= rules.runawayMaxRequests) {
      alerts.push({
        type: "runaway",
        severity: "critical",
        title: "Possible runaway agent (high request rate)",
        message: `${count} requests in the last 5 minutes`,
        details: { requests: count, windowMinutes: 5 },
      });
    }
    if (tokens >= rules.runawayMaxTokens) {
      alerts.push({
        type: "runaway",
        severity: "critical",
        title: "Possible runaway agent (token burst)",
        message: `${tokens.toLocaleString()} tokens consumed in the last 5 minutes`,
        details: { tokens, windowMinutes: 5 },
      });
    }
  }

  // --- High-cost single requests ---
  if (rules.highCostEnabled) {
    const pricey = await prisma.request.findMany({
      where: {
        userId,
        cost: { gte: rules.highCostThreshold },
      },
      orderBy: { timestamp: "desc" },
      take: 5,
      include: { provider: { select: { name: true } } },
    });

    pricey.forEach((req) => {
      alerts.push({
        type: "highcost",
        severity: "warning",
        title: "High-cost request detected",
        message: `${req.provider.name} / ${req.model} cost $${req.cost.toFixed(4)} (${req.totalTokens.toLocaleString()} tokens)`,
        details: {
          provider: req.provider.name,
          model: req.model,
          cost: req.cost,
          tokens: req.totalTokens,
        },
      });
    });
  }

  // --- Unusual spike vs baseline: current hour vs trailing average ---
  if (rules.spikeEnabled) {
    const hourAgo = new Date(Date.now() - HOUR);
    const weekAgo = new Date(Date.now() - 7 * DAY);

    const [currentHour, baseline] = await Promise.all([
      prisma.request.aggregate({
        where: {
          userId,
          timestamp: { gte: hourAgo },
        },
        _count: true,
        _sum: { cost: true, totalTokens: true },
      }),
      prisma.request.aggregate({
        where: {
          userId,
          timestamp: { gte: weekAgo, lt: hourAgo },
        },
        _sum: { cost: true },
      }),
    ]);

    const elapsedHours = Math.max(1, (Date.now() - weekAgo.getTime()) / HOUR);
    const avgHourlyCost = (baseline._sum.cost || 0) / elapsedHours;
    const currentHourCost = currentHour._sum.cost || 0;

    if (
      avgHourlyCost > 0 &&
      currentHourCost >= avgHourlyCost * rules.spikeFactor &&
      currentHourCost >= rules.highCostThreshold
    ) {
      const ratio = Math.round((currentHourCost / avgHourlyCost) * 10) / 10;
      alerts.push({
        type: "spike",
        severity: "warning",
        title: "Usage spike above baseline",
        message: `$${currentHourCost.toFixed(2)} this hour vs $${avgHourlyCost.toFixed(4)}/hr average (${ratio}x)`,
        details: {
          currentHourCost,
          avgHourlyCost,
          requests: currentHour._count,
          ratio,
        },
      });
    }
  }

  return alerts;
}