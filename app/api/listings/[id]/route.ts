import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const roomTypes = new Set(["private_room", "shared_room", "apartment", "house"]);

async function getOwnedListing(id: number, userId: string) {
  const listing = await env.DB.prepare(`SELECT l.id,l.title,l.description,l.monthly_rent AS monthlyRent,l.deposit,
    l.room_type AS roomType,l.bedrooms,l.bathrooms,l.furnished,l.utilities_included AS utilitiesIncluded,
    l.available_from AS availableFrom,l.house_rules AS houseRules,l.status,city.slug AS citySlug,
    neighborhood.slug AS neighborhoodSlug FROM listings l JOIN locations city ON city.id=l.city_id
    LEFT JOIN locations neighborhood ON neighborhood.id=l.neighborhood_id WHERE l.id=? AND l.owner_id=?`)
    .bind(id, userId).first();
  if (!listing) return null;
  const photos = await env.DB.prepare("SELECT id, storage_key AS storageKey, alt_text AS altText FROM listing_photos WHERE listing_id=? ORDER BY sort_order,id")
    .bind(id).all();
  return { ...listing, photos: photos.results };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const { id } = await params;
  const listing = await getOwnedListing(Number(id), identity.userId);
  if (!listing) return Response.json({ error: "Listing not found." }, { status: 404 });
  return Response.json({ listing });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || !await getOwnedListing(id, identity.userId)) return Response.json({ error: "Listing not found." }, { status: 404 });
    const payload = await request.json() as Record<string, unknown>;
    const title = clean(payload.title, 120), description = clean(payload.description, 1200);
    const citySlug = clean(payload.citySlug, 100), neighborhoodSlug = clean(payload.neighborhoodSlug, 120);
    const monthlyRent = Math.max(0, Number(payload.monthlyRent) || 0), deposit = Math.max(0, Number(payload.deposit) || 0);
    const roomType = clean(payload.roomType, 40), availableFrom = clean(payload.availableFrom, 20);
    if (!title || !description || !citySlug || !neighborhoodSlug || !monthlyRent || !availableFrom || !roomTypes.has(roomType)) {
      return Response.json({ error: "Complete all required listing details." }, { status: 400 });
    }
    const city = await env.DB.prepare("SELECT id FROM locations WHERE slug=?").bind(citySlug).first<{ id: number }>();
    const neighborhood = await env.DB.prepare("SELECT id FROM locations WHERE slug=?").bind(neighborhoodSlug).first<{ id: number }>();
    if (!city || !neighborhood) return Response.json({ error: "Select a supported city and neighborhood." }, { status: 400 });
    const rules = clean(payload.houseRules, 500).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    await env.DB.prepare(`UPDATE listings SET title=?,description=?,city_id=?,neighborhood_id=?,monthly_rent=?,deposit=?,
      room_type=?,bedrooms=?,bathrooms=?,furnished=?,utilities_included=?,available_from=?,house_rules=?,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND owner_id=?`).bind(title, description, city.id, neighborhood.id, monthlyRent, deposit, roomType,
        Math.max(1, Number(payload.bedrooms) || 1), Math.max(1, Number(payload.bathrooms) || 1),
        Boolean(payload.furnished) ? 1 : 0, Boolean(payload.utilitiesIncluded) ? 1 : 0, availableFrom, JSON.stringify(rules), id, identity.userId).run();
    return Response.json({ updated: true });
  } catch {
    return Response.json({ error: "Unable to update this listing." }, { status: 500 });
  }
}
