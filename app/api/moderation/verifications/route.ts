import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

async function moderator() {
  const identity = await getChatGPTUser();
  if (!identity) return null;
  const user = await env.DB.prepare("SELECT role FROM users WHERE id=? AND status='active'")
    .bind(identity.userId).first<{ role: string }>();
  return user && (user.role === "moderator" || user.role === "admin") ? identity : null;
}

export async function GET() {
  if (!await moderator()) return Response.json({ error: "Moderator access is required." }, { status: 403 });
  try {
    const result = await env.DB.prepare(`SELECT vr.id,vr.type,vr.user_id AS userId,vr.listing_id AS listingId,
      vr.document_key AS documentKey,vr.document_name AS documentName,vr.content_type AS contentType,
      vr.status,vr.moderator_note AS moderatorNote,vr.created_at AS createdAt,
      p.first_name AS applicantName,u.email,l.title AS listingTitle
      FROM verification_requests vr JOIN users u ON u.id=vr.user_id
      LEFT JOIN profiles p ON p.user_id=vr.user_id LEFT JOIN listings l ON l.id=vr.listing_id
      ORDER BY CASE vr.status WHEN 'pending' THEN 0 ELSE 1 END,vr.created_at DESC,vr.id DESC LIMIT 200`).all();
    return Response.json({ requests: result.results });
  } catch {
    return Response.json({ error: "Unable to load verification requests." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!await moderator()) return Response.json({ error: "Moderator access is required." }, { status: 403 });
  try {
    const payload = await request.json() as { id?: number; status?: string; note?: string };
    const id = Number(payload.id);
    const status = payload.status;
    if (!Number.isInteger(id) || id < 1 || (status !== "approved" && status !== "rejected")) {
      return Response.json({ error: "Choose approve or reject." }, { status: 400 });
    }
    const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 800) : "";
    if (status === "rejected" && !note) {
      return Response.json({ error: "Add a short reason before rejecting." }, { status: 400 });
    }
    const item = await env.DB.prepare(`SELECT id,user_id AS userId,type,listing_id AS listingId,status
      FROM verification_requests WHERE id=?`).bind(id)
      .first<{ id: number; userId: string; type: "identity" | "property"; listingId: number | null; status: string }>();
    if (!item) return Response.json({ error: "Verification request not found." }, { status: 404 });
    if (item.status !== "pending") return Response.json({ error: "This request has already been reviewed." }, { status: 409 });

    const updates = [env.DB.prepare(`UPDATE verification_requests SET status=?,moderator_note=?,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND status='pending'`).bind(status, note, id)];
    if (item.type === "identity") {
      updates.push(env.DB.prepare(`UPDATE users SET identity_verified_at=${status === "approved" ? "CURRENT_TIMESTAMP" : "NULL"},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(item.userId));
    } else if (item.listingId) {
      updates.push(env.DB.prepare(`UPDATE listings SET verification_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_id=?`)
        .bind(status === "approved" ? "verified" : "unverified", item.listingId, item.userId));
    }
    updates.push(env.DB.prepare(`INSERT INTO notifications (user_id,type,title,body,href)
      SELECT ?,'verification',?,?,'/verification' WHERE EXISTS
      (SELECT 1 FROM verification_requests WHERE id=? AND status=?)`)
      .bind(item.userId, `${item.type === "identity" ? "Identity" : "Property"} verification ${status}`, status === "approved" ? `Your ${item.type} verification was approved.` : `Your ${item.type} verification needs a new document. ${note}`, id, status));
    await env.DB.batch(updates);
    return Response.json({ updated: true });
  } catch {
    return Response.json({ error: "Unable to review this request." }, { status: 500 });
  }
}
