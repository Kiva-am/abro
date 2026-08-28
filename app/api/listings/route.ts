import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { listings, locations, users } from "@/db/schema";

type ListingPayload = {
  title?: string; description?: string; citySlug?: string; neighborhoodSlug?: string;
  monthlyRent?: number; deposit?: number; roomType?: "private_room" | "shared_room" | "apartment" | "house";
  bedrooms?: number; bathrooms?: number; furnished?: boolean; utilitiesIncluded?: boolean;
  availableFrom?: string; houseRules?: string;
};

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = clean(url.searchParams.get("city"), 100);
  const roomType = clean(url.searchParams.get("roomType"), 40);
  const maxRent = Math.max(0, Number(url.searchParams.get("maxRent")) || 0);
  const clauses = ["l.status = 'active'"];
  const values: Array<string | number> = [];
  if (city) { clauses.push("city.slug = ?"); values.push(city); }
  if (roomType) { clauses.push("l.room_type = ?"); values.push(roomType); }
  if (maxRent) { clauses.push("l.monthly_rent <= ?"); values.push(maxRent); }

  const query = env.DB.prepare(`SELECT l.id, l.title, l.description, l.monthly_rent AS monthlyRent,
    l.deposit, l.room_type AS roomType, l.bedrooms, l.bathrooms, l.furnished,
    l.utilities_included AS utilitiesIncluded, l.available_from AS availableFrom,
    l.verification_status AS verificationStatus, city.name AS city,
    (SELECT storage_key FROM listing_photos WHERE listing_id = l.id ORDER BY sort_order, id LIMIT 1) AS photoKey,
    neighborhood.name AS neighborhood
    FROM listings l
    JOIN locations city ON city.id = l.city_id
    LEFT JOIN locations neighborhood ON neighborhood.id = l.neighborhood_id
    WHERE ${clauses.join(" AND ")}
    ORDER BY l.created_at DESC LIMIT 60`).bind(...values);
  const result = await query.all();
  return Response.json({ listings: result.results });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required to publish a listing." }, { status: 401 });
  try {
    const payload = await request.json() as ListingPayload;
    const title = clean(payload.title, 120), description = clean(payload.description, 1200);
    const citySlug = clean(payload.citySlug, 100), neighborhoodSlug = clean(payload.neighborhoodSlug, 120);
    const monthlyRent = Math.max(0, Number(payload.monthlyRent) || 0);
    const deposit = Math.max(0, Number(payload.deposit) || 0);
    const roomTypes = new Set(["private_room", "shared_room", "apartment", "house"]);
    if (!title || !description || !citySlug || !neighborhoodSlug || !monthlyRent || !payload.availableFrom || !roomTypes.has(payload.roomType ?? "")) {
      return Response.json({ error: "Complete all required listing details." }, { status: 400 });
    }
    const db = getDb();
    const [city] = await db.select({ id: locations.id }).from(locations).where(eq(locations.slug, citySlug)).limit(1);
    const [neighborhood] = await db.select({ id: locations.id }).from(locations).where(eq(locations.slug, neighborhoodSlug)).limit(1);
    if (!city || !neighborhood) return Response.json({ error: "Select a supported city and neighborhood." }, { status: 400 });
    await db.insert(users).values({ id: identity.userId, email: identity.email }).onConflictDoUpdate({ target: users.id, set: { email: identity.email } });
    const [created] = await db.insert(listings).values({
      ownerId: identity.userId, title, description, cityId: city.id, neighborhoodId: neighborhood.id,
      monthlyRent, deposit, roomType: payload.roomType!, bedrooms: Math.max(1, Number(payload.bedrooms) || 1),
      bathrooms: Math.max(1, Number(payload.bathrooms) || 1), furnished: Boolean(payload.furnished),
      utilitiesIncluded: Boolean(payload.utilitiesIncluded), availableFrom: clean(payload.availableFrom, 20),
      houseRules: JSON.stringify(clean(payload.houseRules, 500).split(/\r?\n/).map((item) => item.trim()).filter(Boolean)), status: "active",
    }).returning({ id: listings.id });
    return Response.json({ created: true, id: created.id });
  } catch {
    return Response.json({ error: "Unable to publish this listing right now." }, { status: 500 });
  }
}
