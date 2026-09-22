"use server";

import { PrizeContributionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { addPrizeContribution, parseDollarAmount } from "@/lib/app-settings";

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidatePrizePaths() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/settings");
}

export async function offerPrizeContribution(input: {
  amount: string;
  note: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }

  const amountCents = parseDollarAmount(input.amount);
  if (amountCents == null) {
    return {
      ok: false,
      error: "Enter a valid amount greater than 0 (e.g. 25 or 25.00)",
    };
  }

  try {
    await addPrizeContribution({
      amountCents,
      userId: session.user.id,
      note: input.note,
      status: PrizeContributionStatus.PENDING,
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not submit offer. Try again.",
    };
  }

  revalidatePrizePaths();
  return { ok: true };
}
