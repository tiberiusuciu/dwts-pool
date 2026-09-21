import { DisplayNameForm } from "@/components/auth/display-name-form";

export default function OnboardingPage() {
  return (
    <div className="flex flex-1 flex-col justify-center px-4 py-12">
      <DisplayNameForm
        className="mx-auto w-full max-w-sm"
        title="What should we call you?"
        subtitle="Pick a display name for the leaderboard. You can change it later."
        submitLabel="Continue"
        redirectTo="/"
      />
    </div>
  );
}
