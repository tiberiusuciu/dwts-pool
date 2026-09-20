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

  const displayName =
    typeof body === "object" &&
    body !== null &&
    "displayName" in body &&
    typeof (body as { displayName: unknown }).displayName === "string"
      ? (body as { displayName: string }).displayName.trim()
      : "";

  if (displayName.length < 2 || displayName.length > 40) {
    return NextResponse.json(
      { error: "Display name must be 2–40 characters" },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { displayName },
    select: { id: true, displayName: true },
  });

  return NextResponse.json(user);
}
