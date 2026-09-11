import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");
  const model = searchParams.get("model");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {
    userId: session.user.id,
  };

  if (provider) {
    where.provider = { name: provider };
  }

  if (model) {
    where.model = model;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {
      (where.timestamp as Record<string, Date>).gte = new Date(startDate);
    }
    if (endDate) {
      (where.timestamp as Record<string, Date>).lte = new Date(endDate);
    }
  }

  const [requests, total] = await Promise.all([
    prisma.request.findMany({
      where,
      include: {
        provider: {
          select: { name: true },
        },
      },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.request.count({ where }),
  ]);

  return NextResponse.json({
    requests,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { providerId, model, promptTokens, completionTokens, promptPreview, responsePreview } =
    await req.json();

  if (!providerId || !model || promptTokens === undefined || completionTokens === undefined) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const totalTokens = promptTokens + completionTokens;

  // Calculate cost based on model
  const cost = calculateCost(model, promptTokens, completionTokens);

  const request = await prisma.request.create({
    data: {
      userId: session.user.id,
      providerId,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      cost,
      promptPreview: promptPreview?.substring(0, 100),
      responsePreview: responsePreview?.substring(0, 100),
    },
  });

  return NextResponse.json(request, { status: 201 });
}

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  // Pricing per 1K tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    // OpenAI
    "gpt-4": { input: 0.03, output: 0.06 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
    "gpt-4o": { input: 0.005, output: 0.015 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
    // Anthropic
    "claude-3-opus": { input: 0.015, output: 0.075 },
    "claude-3-sonnet": { input: 0.003, output: 0.015 },
    "claude-3-haiku": { input: 0.00025, output: 0.00125 },
    "claude-3-5-sonnet": { input: 0.003, output: 0.015 },
    "claude-3-5-haiku": { input: 0.001, output: 0.005 },
  };

  const modelPricing = pricing[model.toLowerCase()] || pricing["gpt-4o-mini"];

  const inputCost = (promptTokens / 1000) * modelPricing.input;
  const outputCost = (completionTokens / 1000) * modelPricing.output;

  return Math.round((inputCost + outputCost) * 10000) / 10000;
}
