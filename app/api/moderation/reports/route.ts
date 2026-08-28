import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

async function moderator() {
  const identity = await getChatGPTUser();
  if (!identity) return null;
  const user = await env.DB.prepare("SELECT role FROM users WHERE id=? AND status='active'").bind(identity.userId).first<{ role: string }>();
  return user && (user.role === "moderator" || user.role === "admin") ? identity : null;
}

export async function GET() {
  if (!await moderator()) return Response.json({ error: "Moderator access is required." }, { status: 403 });
  try {
    const result = await env.DB.prepare(`SELECT r.id,r.target_type AS targetType,r.listing_id AS listingId,
      r.reported_user_id AS reportedUserId,r.reason,r.details,r.status,r.moderator_note AS moderatorNote,
      r.created_at AS createdAt,l.title AS listingTitle,reported.first_name AS reportedName,
      reporter.first_name AS reporterName FROM reports r LEFT JOIN listings l ON l.id=r.listing_id
      LEFT JOIN profiles reported ON reported.user_id=r.reported_user_id
      LEFT JOIN profiles reporter ON reporter.user_id=r.reporter_id
      ORDER BY CASE r.status WHEN 'open' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END,r.created_at DESC LIMIT 200`).all();
    return Response.json({ reports: result.results });
  } catch { return Response.json({ error: "Unable to load reports." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  if (!await moderator()) return Response.json({ error: "Moderator access is required." }, { status: 403 });
  try {
    const payload = await request.json() as { id?: number; status?: string; note?: string };
    const statuses = new Set(["reviewing", "resolved", "dismissed"]);
    if (!Number.isInteger(Number(payload.id)) || !statuses.has(payload.status || "")) return Response.json({ error: "Choose a valid report status." }, { status: 400 });
    const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 800) : "";
    const result = await env.DB.prepare("UPDATE reports SET status=?,moderator_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(payload.status, note, Number(payload.id)).run();
    if (!result.meta.changes) return Response.json({ error: "Report not found." }, { status: 404 });
    return Response.json({ updated: true });
  } catch { return Response.json({ error: "Unable to update this report." }, { status: 500 }); }
}
