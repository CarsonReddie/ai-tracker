import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const budgets = await prisma.budget.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(budgets);
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { monthlyLimit, alertThreshold, provider } = await req.json();

  if (!monthlyLimit || monthlyLimit <= 0) {
    return NextResponse.json(
      { error: "Monthly limit must be greater than 0" },
      { status: 400 }
    );
  }

  const budget = await prisma.budget.create({
    data: {
      userId: session.user.id,
      monthlyLimit,
      alertThreshold: alertThreshold || 0.8,
      provider: provider || null,
    },
  });

  return NextResponse.json(budget, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await prisma.budget.deleteMany({
    where: {
      id,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ success: true });
}