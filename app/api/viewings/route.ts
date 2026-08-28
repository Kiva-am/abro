import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { notificationStatement } from "@/lib/notifications";

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const result = await env.DB.prepare(`SELECT vr.id,vr.listing_id AS listingId,vr.requested_at AS requestedAt,
      vr.note,vr.status,vr.created_at AS createdAt,l.title AS listingTitle,l.status AS listingStatus,
      city.name AS city,neighborhood.name AS neighborhood,
      (SELECT storage_key FROM listing_photos WHERE listing_id=l.id ORDER BY sort_order,id LIMIT 1) AS photoKey,
      CASE WHEN vr.owner_id=? THEN 'incoming' ELSE 'outgoing' END AS direction,
      CASE WHEN vr.owner_id=? THEN vr.renter_id ELSE vr.owner_id END AS otherUserId,
      CASE WHEN vr.owner_id=? THEN renter_profile.first_name ELSE owner_profile.first_name END AS otherName
      FROM viewing_requests vr JOIN listings l ON l.id=vr.listing_id
      JOIN locations city ON city.id=l.city_id LEFT JOIN locations neighborhood ON neighborhood.id=l.neighborhood_id
      LEFT JOIN profiles renter_profile ON renter_profile.user_id=vr.renter_id
      LEFT JOIN profiles owner_profile ON owner_profile.user_id=vr.owner_id
      WHERE vr.owner_id=? OR vr.renter_id=? ORDER BY vr.requested_at DESC,vr.id DESC LIMIT 100`)
      .bind(identity.userId, identity.userId, identity.userId, identity.userId, identity.userId).all();
    await env.DB.prepare("UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE user_id=? AND type='viewing' AND read_at IS NULL").bind(identity.userId).run();
    return Response.json({ viewings: result.results });
  } catch {
    return Response.json({ error: "Unable to load viewing requests." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const payload = await request.json() as { listingId?: number; requestedAt?: string; note?: string };
    const listingId = Number(payload.listingId);
    const requestedDate = new Date(typeof payload.requestedAt === "string" ? payload.requestedAt : "");
    const latestAllowed = Date.now() + 180 * 24 * 60 * 60 * 1000;
    if (!Number.isInteger(listingId) || listingId < 1 || !Number.isFinite(requestedDate.getTime()) || requestedDate.getTime() < Date.now() + 30 * 60 * 1000 || requestedDate.getTime() > latestAllowed) {
      return Response.json({ error: "Choose a viewing time between 30 minutes and 180 days from now." }, { status: 400 });
    }
    const listing = await env.DB.prepare("SELECT id,owner_id AS ownerId,title FROM listings WHERE id=? AND status='active'").bind(listingId).first<{ id: number; ownerId: string; title: string }>();
    if (!listing) return Response.json({ error: "This property is no longer available." }, { status: 404 });
    if (listing.ownerId === identity.userId) return Response.json({ error: "You cannot request a viewing of your own property." }, { status: 400 });
    await env.DB.prepare("INSERT INTO users (id,email) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email")
      .bind(identity.userId, identity.email).run();
    const existing = await env.DB.prepare("SELECT id FROM viewing_requests WHERE listing_id=? AND renter_id=? AND status='pending'")
      .bind(listingId, identity.userId).first();
    if (existing) return Response.json({ error: "You already have a pending request for this property." }, { status: 409 });
    const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 500) : "";
    await env.DB.batch([
      env.DB.prepare("INSERT INTO viewing_requests (listing_id,renter_id,owner_id,requested_at,note) VALUES (?,?,?,?,?)")
        .bind(listingId, identity.userId, listing.ownerId, requestedDate.toISOString(), note),
      notificationStatement(listing.ownerId, "viewing", "New viewing request", `A renter requested a viewing for ${listing.title}.`, "/viewings"),
    ]);
    return Response.json({ created: true });
  } catch {
    return Response.json({ error: "Unable to request this viewing." }, { status: 500 });
  }
}
