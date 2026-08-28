import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    const { status } = await request.json() as { status?: string };
    const item = await env.DB.prepare("SELECT id,owner_id AS ownerId,renter_id AS renterId,status FROM viewing_requests WHERE id=?")
      .bind(id).first<{ id: number; ownerId: string; renterId: string; status: string }>();
    if (!item || (identity.userId !== item.ownerId && identity.userId !== item.renterId)) return Response.json({ error: "Viewing request not found." }, { status: 404 });
    const ownerAction = identity.userId === item.ownerId && item.status === "pending" && (status === "accepted" || status === "declined");
    const renterAction = identity.userId === item.renterId && (item.status === "pending" || item.status === "accepted") && status === "cancelled";
    if (!ownerAction && !renterAction) return Response.json({ error: "This request can no longer be changed that way." }, { status: 400 });
    await env.DB.prepare("UPDATE viewing_requests SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?")
      .bind(status, id, item.status).run();
    return Response.json({ updated: true, status });
  } catch {
    return Response.json({ error: "Unable to update this viewing request." }, { status: 500 });
  }
}
