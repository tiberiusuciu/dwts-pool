import { auth } from "@/auth";
import { getLiveEpisodeSnapshot } from "@/lib/live-breakdown";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const snapshot = await getLiveEpisodeSnapshot(id);
  if (!snapshot) {
    return Response.json({ error: "Episode not found" }, { status: 404 });
  }

  return Response.json(snapshot);
}
