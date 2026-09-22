"use server";

import { PrizeContributionStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  addPrizeContribution,
  parseDollarAmount,
  removePrizeContribution,
  setPrizeContributionStatus,
} from "@/lib/app-settings";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return null;
  }
  return session;
}

function revalidatePrizePaths() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/settings");
}

export async function createPrizeContribution(input: {
  amount: string;
  userId: string;
  guestName: string;
  note: string;
}): Promise<ActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Admin only" };
  }

  const amountCents = parseDollarAmount(input.amount);
  if (amountCents == null) {
    return {
      ok: false,
      error: "Enter a valid amount greater than 0 (e.g. 25 or 25.00)",
    };
  }

  const isGuest = !input.userId || input.userId === "__guest__";
  const guestName = input.guestName.trim();

  if (isGuest && guestName.length < 2) {
    return {
      ok: false,
      error: "Enter a name for guests who are not in the pool",
    };
  }

  try {
    await addPrizeContribution({
      amountCents,
      userId: isGuest ? null : input.userId,
      guestName: isGuest ? guestName : null,
      note: input.note,
      status: PrizeContributionStatus.APPROVED,
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not save contribution. Run prisma generate/migrate.",
    };
  }

  revalidatePrizePaths();
  return { ok: true };
}

export async function approvePrizeContribution(
  id: string,
): Promise<ActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Admin only" };
  }

  try {
    await setPrizeContributionStatus(id, PrizeContributionStatus.APPROVED);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not approve contribution",
    };
  }

  revalidatePrizePaths();
  return { ok: true };
}

export async function rejectPrizeContribution(
  id: string,
): Promise<ActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Admin only" };
  }

  try {
    await setPrizeContributionStatus(id, PrizeContributionStatus.REJECTED);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not decline contribution",
    };
  }

  revalidatePrizePaths();
  return { ok: true };
}

export async function deletePrizeContribution(
  id: string,
): Promise<ActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Admin only" };
  }

  try {
    await removePrizeContribution(id);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not remove contribution",
    };
  }

  revalidatePrizePaths();
  return { ok: true };
}
