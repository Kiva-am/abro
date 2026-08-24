import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { favorites, listings, users } from "@/db/schema";

export async function GET() {
  try {
    const identity = await getChatGPTUser();
    if (!identity) return Response.json({ listingIds: [] });
    const rows = await getDb().select({ listingId: favorites.listingId }).from(favorites).where(eq(favorites.userId, identity.userId));
    return Response.json({ listingIds: rows.map((row) => row.listingId) });
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
