import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

const allowedStatuses = new Set(["active", "paused", "rented", "removed"]);

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const result = await env.DB.prepare(`SELECT l.id, l.title, l.description,
      l.monthly_rent AS monthlyRent, l.room_type AS roomType, l.status,
      l.verification_status AS verificationStatus, l.available_from AS availableFrom,
      l.created_at AS createdAt, city.name AS city, neighborhood.name AS neighborhood,
      (SELECT storage_key FROM listing_photos WHERE listing_id = l.id ORDER BY sort_order, id LIMIT 1) AS photoKey
      FROM listings l
      JOIN locations city ON city.id = l.city_id
      LEFT JOIN locations neighborhood ON neighborhood.id = l.neighborhood_id
      WHERE l.owner_id = ?
      ORDER BY l.created_at DESC, l.id DESC`).bind(identity.userId).all();
    return Response.json({ listings: result.results });
  } catch {
    return Response.json({ error: "Unable to load your listings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const payload = await request.json() as { id?: number; status?: string };
    const id = Number(payload.id);
    const status = typeof payload.status === "string" ? payload.status : "";
    if (!Number.isInteger(id) || id < 1 || !allowedStatuses.has(status)) {
      return Response.json({ error: "Choose a valid listing and status." }, { status: 400 });
    }
    const result = await env.DB.prepare(
      "UPDATE listings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ?"
    ).bind(status, id, identity.userId).run();
    if (!result.meta.changes) return Response.json({ error: "Listing not found." }, { status: 404 });
    return Response.json({ updated: true, id, status });
  } catch {
    return Response.json({ error: "Unable to update this listing." }, { status: 500 });
  }
}
