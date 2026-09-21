"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";

import { CoupleAvatar } from "@/components/couples/couple-avatar";
import { useT } from "@/components/i18n/locale-provider";
import type { CoupleOption } from "@/lib/couple";

async function saveProfile(input: {
  displayName: string;
  rootingForCoupleId: string | null;
}) {
  const res = await fetch("/api/user/display-name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Could not save");
  }
  return data;
}

export function DisplayNameForm({
  initialName = "",
  initialRootingForCoupleId = null,
  couples = [],
  title,
  subtitle,
  submitLabel,
  redirectTo = "/",
  className = "w-full max-w-sm",
  headingLevel = 1,
  hideFieldLabel = false,
  mode = "submit",
}: {
  initialName?: string;
  initialRootingForCoupleId?: string | null;
  couples?: CoupleOption[];
  title: string;
  subtitle: string;
  submitLabel: string;
  redirectTo?: string;
  className?: string;
  headingLevel?: 1 | 2;
  hideFieldLabel?: boolean;
  /** `submit` = onboarding Continue; `autosave` = settings (blur / pick). */
  mode?: "submit" | "autosave";
}) {
  const t = useT();
  const router = useRouter();
  const { update } = useSession();
  const [displayName, setDisplayName] = useState(initialName);
  const [rootingForCoupleId, setRootingForCoupleId] = useState<string | null>(
    initialRootingForCoupleId,
  );
  const [pickingCouple, setPickingCouple] = useState(
    () => initialRootingForCoupleId == null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedNameRef = useRef(initialName.trim());
  const savedCoupleRef = useRef(initialRootingForCoupleId);

  const selectedCouple =
    couples.find((c) => c.id === rootingForCoupleId) ?? null;
  const autosave = mode === "autosave";

  async function persist(next: {
    displayName: string;
    rootingForCoupleId: string | null;
  }) {
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      await saveProfile(next);
      savedNameRef.current = next.displayName.trim();
      savedCoupleRef.current = next.rootingForCoupleId;
      await update({ displayName: next.displayName.trim() });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.couldNotSave"));
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (autosave) return;
    const trimmed = displayName.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      setError(t("auth.couldNotSave"));
      return;
    }
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      await saveProfile({
        displayName: trimmed,
        rootingForCoupleId,
      });
      await update({ displayName: trimmed });
      setPending(false);
      setSaved(true);
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : t("auth.couldNotSave"));
    }
  }

  async function onNameBlur() {
    if (!autosave || pending) return;
    const trimmed = displayName.trim();
    if (trimmed.length < 2 || trimmed.length > 40) return;
    if (trimmed === savedNameRef.current) return;
    setDisplayName(trimmed);
    await persist({
      displayName: trimmed,
      rootingForCoupleId: savedCoupleRef.current,
    });
  }

  async function selectCouple(id: string | null) {
    setRootingForCoupleId(id);
    setPickingCouple(false);
    if (!autosave) return;
    const trimmed = displayName.trim() || savedNameRef.current;
    if (trimmed.length < 2) {
      setError(t("auth.couldNotSave"));
      return;
    }
    if (id === savedCoupleRef.current) return;
    await persist({ displayName: trimmed, rootingForCoupleId: id });
  }

  const Heading = headingLevel === 2 ? "h2" : "h1";

  return (
    <div className={className}>
      <Heading className="font-display text-xl font-semibold tracking-tight">
        {title}
      </Heading>
      <p className="mt-2 text-sm text-muted">{subtitle}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <label className="block space-y-1.5">
          <span
            className={hideFieldLabel ? "sr-only" : "text-sm font-medium"}
          >
            {t("auth.displayName")}
          </span>
          <input
            type="text"
            required={!autosave}
            minLength={2}
            maxLength={40}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setSaved(false);
            }}
            onBlur={() => void onNameBlur()}
            placeholder={t("auth.displayNamePlaceholder")}
            className="h-12 w-full rounded-xl border border-border bg-background px-3 text-base outline-none ring-accent focus:ring-2"
          />
        </label>

        {couples.length > 0 ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {t("auth.rootingForLabel")}
            </legend>
            <p className="text-xs text-muted">{t("auth.rootingForHint")}</p>

            {!pickingCouple ? (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2.5">
                {selectedCouple ? (
                  <>
                    <CoupleAvatar
                      celebrityName={selectedCouple.celebrityName}
                      proName={selectedCouple.proName}
                      imageUrl={selectedCouple.imageUrl}
                      proImageUrl={selectedCouple.proImageUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {selectedCouple.celebrityName}
                      </p>
                      <p className="truncate text-xs text-muted">
                        & {selectedCouple.proName}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="min-w-0 flex-1 text-sm text-muted">
                    {t("auth.rootingForNone")}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setPickingCouple(true)}
                  className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent"
                >
                  {t("auth.rootingForChange")}
                </button>
              </div>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-border bg-background p-1">
                <li>
                  <button
                    type="button"
                    onClick={() => void selectCouple(null)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left ${
                      rootingForCoupleId === null
                        ? "bg-accent-soft"
                        : "hover:bg-surface"
                    }`}
                  >
                    <span className="text-sm text-muted">
                      {t("auth.rootingForNone")}
                    </span>
                  </button>
                </li>
                {couples.map((couple) => {
                  const selected = rootingForCoupleId === couple.id;
                  return (
                    <li key={couple.id}>
                      <button
                        type="button"
                        onClick={() => void selectCouple(couple.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left ${
                          selected ? "bg-accent-soft" : "hover:bg-surface"
                        }`}
                      >
                        <CoupleAvatar
                          celebrityName={couple.celebrityName}
                          proName={couple.proName}
                          imageUrl={couple.imageUrl}
                          proImageUrl={couple.proImageUrl}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {couple.celebrityName}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            & {couple.proName}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>
        ) : null}

        {error ? <p className="text-sm text-accent">{error}</p> : null}
        {saved && autosave ? (
          <p className="text-sm text-muted">{t("auth.saved")}</p>
        ) : null}
        {!autosave ? (
          <button
            type="submit"
            disabled={pending}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? t("auth.saving") : submitLabel}
          </button>
        ) : pending ? (
          <p className="text-sm text-muted">{t("auth.saving")}</p>
        ) : null}
      </form>
    </div>
  );
}
