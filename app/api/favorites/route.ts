import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { favorites, listings, users } from "@/db/schema";

export async function GET() {
  try {
    const identity = await getChatGPTUser();
    if (!identity) return Response.json({ listingIds: [] });
    const rows = await env.DB.prepare(`SELECT l.id,l.title,l.description,l.monthly_rent AS monthlyRent,l.room_type AS roomType,
      city.name AS city,neighborhood.name AS neighborhood,
      (SELECT storage_key FROM listing_photos WHERE listing_id=l.id ORDER BY sort_order,id LIMIT 1) AS photoKey
      FROM favorites f JOIN listings l ON l.id=f.listing_id JOIN locations city ON city.id=l.city_id
      LEFT JOIN locations neighborhood ON neighborhood.id=l.neighborhood_id
      WHERE f.user_id=? AND l.status='active' ORDER BY f.created_at DESC,f.id DESC`).bind(identity.userId).all<{ id: number }>();
    return Response.json({ listingIds: rows.results.map((row) => row.id), listings: rows.results });
  } catch {
    return Response.json({ error: "Unable to load saved listings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await getChatGPTUser();
    if (!identity) return Response.json({ error: "Sign in is required to save listings." }, { status: 401 });
    const { listingId } = await request.json() as { listingId?: number };
    const id = Number(listingId);
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Invalid listing." }, { status: 400 });
    const db = getDb();
    const [listing] = await db.select({ id: listings.id }).from(listings).where(and(eq(listings.id, id), eq(listings.status, "active"))).limit(1);
    if (!listing) return Response.json({ error: "Listing not found." }, { status: 404 });
    await db.insert(users).values({ id: identity.userId, email: identity.email }).onConflictDoUpdate({ target: users.id, set: { email: identity.email } });
    const [existing] = await db.select({ id: favorites.id }).from(favorites).where(and(eq(favorites.userId, identity.userId), eq(favorites.listingId, id))).limit(1);
    if (existing) {
      await db.delete(favorites).where(eq(favorites.id, existing.id));
      return Response.json({ saved: false });
    }
    await db.insert(favorites).values({ userId: identity.userId, listingId: id });
    return Response.json({ saved: true });
  } catch {
    return Response.json({ error: "Unable to update saved listings." }, { status: 500 });
  }
}
