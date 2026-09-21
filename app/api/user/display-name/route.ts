import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : null;

  const displayName =
    typeof record?.displayName === "string" ? record.displayName.trim() : "";

  if (displayName.length < 2 || displayName.length > 40) {
    return NextResponse.json(
      { error: "Display name must be 2–40 characters" },
      { status: 400 },
    );
  }

  let rootingForCoupleId: string | null | undefined;
  if (record && "rootingForCoupleId" in record) {
    const raw = record.rootingForCoupleId;
    if (raw === null || raw === "") {
      rootingForCoupleId = null;
    } else if (typeof raw === "string") {
      const couple = await prisma.couple.findUnique({
        where: { id: raw },
        select: { id: true },
      });
      if (!couple) {
        return NextResponse.json(
          { error: "Pick a valid couple to root for" },
          { status: 400 },
        );
      }
      rootingForCoupleId = couple.id;
    } else {
      return NextResponse.json(
        { error: "Invalid rootingForCoupleId" },
        { status: 400 },
      );
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      displayName,
      ...(rootingForCoupleId !== undefined ? { rootingForCoupleId } : {}),
    },
    select: {
      id: true,
      displayName: true,
      rootingForCoupleId: true,
    },
  });

  return NextResponse.json(user);
}
