import { OnboardingClient } from "@/components/auth/onboarding-client";
import { getAllCouples } from "@/lib/predictions";

export default async function OnboardingPage() {
  const couples = await getAllCouples();
  return <OnboardingClient couples={couples} />;
}
