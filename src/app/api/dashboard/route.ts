import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Current month stats
  const currentMonthStats = await prisma.request.aggregate({
    where: {
      userId: session.user.id,
      timestamp: { gte: startOfMonth },
    },
    _sum: {
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      cost: true,
    },
    _count: true,
  });

  // Last month stats
  const lastMonthStats = await prisma.request.aggregate({
    where: {
      userId: session.user.id,
      timestamp: { gte: startOfLastMonth, lte: endOfLastMonth },
    },
    _sum: {
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      cost: true,
    },
    _count: true,
  });

  // Stats by provider
  const providerStats = await prisma.request.groupBy({
    by: ["providerId"],
    where: {
      userId: session.user.id,
      timestamp: { gte: startOfMonth },
    },
    _sum: {
      totalTokens: true,
      cost: true,
    },
    _count: true,
  });

  const providerNames = await prisma.provider.findMany({
    where: {
      id: { in: providerStats.map((p: { providerId: string }) => p.providerId) },
    },
    select: { id: true, name: true },
  });

  const providerNameMap = new Map(providerNames.map((p: { id: string; name: string }) => [p.id, p.name]));

  const providers = providerStats.map((stat: { providerId: string; _sum: { totalTokens: number | null; cost: number | null }; _count: number }) => ({
    name: providerNameMap.get(stat.providerId) || "Unknown",
    tokens: stat._sum.totalTokens || 0,
    cost: stat._sum.cost || 0,
    requests: stat._count,
  }));

  // Daily usage for the last 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dailyRequests = await prisma.request.groupBy({
    by: ["timestamp"],
    where: {
      userId: session.user.id,
      timestamp: { gte: thirtyDaysAgo },
    },
    _sum: {
      totalTokens: true,
      cost: true,
    },
    _count: true,
  });

  // Group by day
  const dailyUsage: Record<string, { tokens: number; cost: number; requests: number }> = {};
  dailyRequests.forEach((req: { timestamp: Date; _sum: { totalTokens: number | null; cost: number | null }; _count: number }) => {
    const day = req.timestamp.toISOString().split("T")[0];
    if (!dailyUsage[day]) {
      dailyUsage[day] = { tokens: 0, cost: 0, requests: 0 };
    }
    dailyUsage[day].tokens += req._sum.totalTokens || 0;
    dailyUsage[day].cost += req._sum.cost || 0;
    dailyUsage[day].requests += req._count;
  });

  // Budget alerts
  const budgets = await prisma.budget.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
  });

  const alerts = budgets
    .map((budget: { provider: string | null; monthlyLimit: number; alertThreshold: number }) => {
      const currentCost = budget.provider
        ? providers.find((p: { name: string; cost: number }) => p.name === budget.provider)?.cost || 0
        : currentMonthStats._sum.cost || 0;

      const usage = currentCost / budget.monthlyLimit;
      if (usage >= budget.alertThreshold) {
        return {
          provider: budget.provider || "Total",
          currentCost,
          limit: budget.monthlyLimit,
          usage: Math.round(usage * 100),
        };
      }
      return null;
    })
    .filter(Boolean);

  return NextResponse.json({
    currentMonth: {
      tokens: currentMonthStats._sum.totalTokens || 0,
      cost: currentMonthStats._sum.cost || 0,
      requests: currentMonthStats._count,
      promptTokens: currentMonthStats._sum.promptTokens || 0,
      completionTokens: currentMonthStats._sum.completionTokens || 0,
    },
    lastMonth: {
      tokens: lastMonthStats._sum.totalTokens || 0,
      cost: lastMonthStats._sum.cost || 0,
      requests: lastMonthStats._count,
    },
    providers,
    dailyUsage: Object.entries(dailyUsage)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    alerts,
  });
}
