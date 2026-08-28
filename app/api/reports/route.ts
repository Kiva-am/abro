import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

const reasons = new Set(["scam", "inaccurate", "harassment", "discrimination", "unsafe", "spam", "other"]);

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const payload = await request.json() as { targetType?: string; listingId?: number; userId?: string; reason?: string; details?: string };
    if (!reasons.has(payload.reason || "") || (payload.targetType !== "listing" && payload.targetType !== "member")) return Response.json({ error: "Choose a valid report reason." }, { status: 400 });
    let listingId: number | null = null, reportedUserId: string | null = null;
    if (payload.targetType === "listing") {
      const listing = await env.DB.prepare("SELECT id,owner_id AS ownerId FROM listings WHERE id=?").bind(Number(payload.listingId)).first<{ id: number; ownerId: string }>();
      if (!listing) return Response.json({ error: "Listing not found." }, { status: 404 });
      if (listing.ownerId === identity.userId) return Response.json({ error: "You cannot report your own listing." }, { status: 400 });
      listingId = listing.id; reportedUserId = listing.ownerId;
    } else {
      const person = await env.DB.prepare("SELECT id FROM users WHERE id=? AND status='active'").bind(payload.userId || "").first<{ id: string }>();
      if (!person) return Response.json({ error: "Member not found." }, { status: 404 });
      if (person.id === identity.userId) return Response.json({ error: "You cannot report your own profile." }, { status: 400 });
      reportedUserId = person.id;
    }
    await env.DB.prepare("INSERT INTO users (id,email) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email").bind(identity.userId, identity.email).run();
    const duplicate = await env.DB.prepare("SELECT id FROM reports WHERE reporter_id=? AND target_type=? AND COALESCE(listing_id,0)=COALESCE(?,0) AND COALESCE(reported_user_id,'')=COALESCE(?,'') AND status IN ('open','reviewing')")
      .bind(identity.userId, payload.targetType, listingId, reportedUserId).first();
    if (duplicate) return Response.json({ error: "You already submitted a report that is under review." }, { status: 409 });
    const details = typeof payload.details === "string" ? payload.details.trim().slice(0, 1000) : "";
    await env.DB.prepare("INSERT INTO reports (reporter_id,target_type,listing_id,reported_user_id,reason,details) VALUES (?,?,?,?,?,?)")
      .bind(identity.userId, payload.targetType, listingId, reportedUserId, payload.reason, details).run();
    return Response.json({ submitted: true });
  } catch { return Response.json({ error: "Unable to submit this report." }, { status: 500 }); }
}
