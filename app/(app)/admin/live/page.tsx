import { redirect } from "next/navigation";

export default async function AdminLiveRedirect({
  searchParams,
}: {
  searchParams: Promise<{ episodeId?: string }>;
}) {
  const params = await searchParams;
  const qs = params.episodeId
    ? `?episodeId=${encodeURIComponent(params.episodeId)}`
    : "";
  redirect(`/admin${qs}`);
}
