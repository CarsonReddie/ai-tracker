import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = await prisma.provider.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json(providers);
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, apiKey } = await req.json();

  if (!name || !apiKey) {
    return NextResponse.json(
      { error: "Name and API key are required" },
      { status: 400 }
    );
  }

  const existingProvider = await prisma.provider.findUnique({
    where: {
      userId_name: {
        userId: session.user.id,
        name,
      },
    },
  });

  if (existingProvider) {
    return NextResponse.json(
      { error: "Provider already exists" },
      { status: 400 }
    );
  }

  const provider = await prisma.provider.create({
    data: {
      userId: session.user.id,
      name,
      apiKey,
    },
  });

  return NextResponse.json(
    { id: provider.id, name: provider.name, isActive: provider.isActive },
    { status: 201 }
  );
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

  await prisma.provider.deleteMany({
    where: {
      id,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ success: true });
}
