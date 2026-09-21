"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { setPrizePoolCents } from "@/lib/app-settings";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updatePrizePool(
  dollarsInput: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return { ok: false, error: "Admin only" };
  }

  const cleaned = dollarsInput.trim().replace(/[$,\s]/g, "");
  if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return {
      ok: false,
      error: "Enter a valid dollar amount (e.g. 500 or 500.00)",
    };
  }

  const dollars = Number(cleaned);
  if (!Number.isFinite(dollars) || dollars < 0 || dollars > 1_000_000) {
    return { ok: false, error: "Amount must be between 0 and 1,000,000" };
  }

  try {
    await setPrizePoolCents(Math.round(dollars * 100));
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not save prize pool. Run prisma generate/migrate.",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/settings");
  return { ok: true };
}
