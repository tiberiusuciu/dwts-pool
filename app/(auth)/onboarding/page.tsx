"use client";

import { DisplayNameForm } from "@/components/auth/display-name-form";
import { useT } from "@/components/i18n/locale-provider";

export default function OnboardingPage() {
  const t = useT();

  return (
    <div className="flex flex-1 flex-col justify-center px-4 py-12">
      <DisplayNameForm
        className="mx-auto w-full max-w-sm"
        title={t("auth.onboardingTitle")}
        subtitle={t("auth.onboardingSubtitle")}
        submitLabel={t("auth.continue")}
        redirectTo="/"
      />
    </div>
  );
}
