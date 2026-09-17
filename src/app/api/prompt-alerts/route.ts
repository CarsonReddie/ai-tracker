import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { screenPrompt, PROMPT_CATEGORY_LABELS } from "@/lib/prompt-safety";

const SCAN_WINDOW_MS = 24 * 60 * 60 * 1000;
const SCAN_LIMIT = 200;

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - SCAN_WINDOW_MS);

  const requests = await prisma.request.findMany({
    where: {
      userId: session.user.id,
      timestamp: { gte: since },
    },
    orderBy: { timestamp: "desc" },
    take: SCAN_LIMIT,
    include: {
      provider: { select: { name: true } },
    },
  });

  const alerts: Array<Record<string, string | number>> = [];
  const seen = new Set<string>();

  for (const req of requests) {
    const findings = screenPrompt(req.promptPreview);
    for (const finding of findings) {
      const key = `${req.id}:${finding.category}`;
      if (seen.has(key)) continue;
      seen.add(key);

      alerts.push({
        requestId: req.id,
        category: finding.category,
        categoryLabel: PROMPT_CATEGORY_LABELS[finding.category],
        severity:
          finding.category === "injection" || finding.category === "secrets"
            ? "critical"
            : "warning",
        matchedPattern: finding.pattern,
        matchedText: finding.matchedText,
        preview: (req.promptPreview || "").slice(0, 120),
        provider: req.provider.name,
        model: req.model,
        timestamp: req.timestamp.toISOString(),
      });
    }
  }

  return NextResponse.json({ alerts, scanned: requests.length });
}