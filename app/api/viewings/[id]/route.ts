import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    const { status } = await request.json() as { status?: string };
    const item = await env.DB.prepare(`SELECT vr.id,vr.owner_id AS ownerId,vr.renter_id AS renterId,vr.status,l.title
      FROM viewing_requests vr JOIN listings l ON l.id=vr.listing_id WHERE vr.id=?`)
      .bind(id).first<{ id: number; ownerId: string; renterId: string; status: string; title: string }>();
    if (!item || (identity.userId !== item.ownerId && identity.userId !== item.renterId)) return Response.json({ error: "Viewing request not found." }, { status: 404 });
    const ownerAction = identity.userId === item.ownerId && item.status === "pending" && (status === "accepted" || status === "declined");
    const renterAction = identity.userId === item.renterId && (item.status === "pending" || item.status === "accepted") && status === "cancelled";
    if (!ownerAction && !renterAction) return Response.json({ error: "This request can no longer be changed that way." }, { status: 400 });
    const recipientId = ownerAction ? item.renterId : item.ownerId;
    const title = ownerAction ? `Viewing ${status}` : "Viewing cancelled";
    const body = ownerAction ? `The owner ${status} your viewing request for ${item.title}.` : `The renter cancelled their viewing request for ${item.title}.`;
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE viewing_requests SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?")
        .bind(status, id, item.status),
      env.DB.prepare(`INSERT INTO notifications (user_id,type,title,body,href)
        SELECT ?,'viewing',?,?,'/viewings' WHERE EXISTS
        (SELECT 1 FROM viewing_requests WHERE id=? AND status=?)`).bind(recipientId, title, body, id, status),
    ]);
    if (!results[0].meta.changes) return Response.json({ error: "This viewing request changed. Refresh and try again." }, { status: 409 });
    return Response.json({ updated: true, status });
  } catch {
    return Response.json({ error: "Unable to update this viewing request." }, { status: 500 });
  }
}
