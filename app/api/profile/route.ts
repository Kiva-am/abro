import { eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { locations, preferences, profiles, users } from "@/db/schema";

type ProfilePayload = {
  firstName?: string;
  occupation?: string;
  bio?: string;
  citySlug?: string;
  neighborhoodSlug?: string;
  minBudget?: number;
  maxBudget?: number;
  roomType?: string;
  moveInDate?: string;
  lifestyle?: string[];
};

function clean(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required to save a profile." }, { status: 401 });

  try {
    const payload = (await request.json()) as ProfilePayload;
    const firstName = clean(payload.firstName, 80);
    const citySlug = clean(payload.citySlug, 100);
    const neighborhoodSlug = clean(payload.neighborhoodSlug, 120);
    const minBudget = Math.max(0, Number(payload.minBudget) || 0);
    const maxBudget = Math.max(0, Number(payload.maxBudget) || 0);

    if (!firstName || !citySlug || !neighborhoodSlug) {
      return Response.json({ error: "Name, city, and neighborhood are required." }, { status: 400 });
    }
    if (maxBudget && minBudget > maxBudget) {
      return Response.json({ error: "Maximum budget must be greater than minimum budget." }, { status: 400 });
    }

    const db = getDb();
    const [city] = await db.select({ id: locations.id, type: locations.type }).from(locations).where(eq(locations.slug, citySlug)).limit(1);
    const [neighborhood] = await db.select({ id: locations.id, type: locations.type, parentId: locations.parentId }).from(locations).where(eq(locations.slug, neighborhoodSlug)).limit(1);
    if (!city || city.type !== "city" || !neighborhood || neighborhood.type !== "neighborhood" || neighborhood.parentId !== city.id) {
      return Response.json({ error: "Please select a neighborhood within the chosen city." }, { status: 400 });
    }

    await db.insert(users).values({ id: identity.userId, email: identity.email }).onConflictDoUpdate({
      target: users.id,
      set: { email: identity.email },
    });

    await db.insert(profiles).values({
      userId: identity.userId,
      firstName,
      occupation: clean(payload.occupation, 120),
      bio: clean(payload.bio, 600),
      cityId: city.id,
      neighborhoodId: neighborhood.id,
    }).onConflictDoUpdate({
      target: profiles.userId,
      set: { firstName, occupation: clean(payload.occupation, 120), bio: clean(payload.bio, 600), cityId: city.id, neighborhoodId: neighborhood.id },
    });

    const lifestyle = new Set(Array.isArray(payload.lifestyle) ? payload.lifestyle : []);
    await db.insert(preferences).values({
      userId: identity.userId,
      minBudget,
      maxBudget,
      preferredCityId: city.id,
      preferredNeighborhoodId: neighborhood.id,
      roomType: clean(payload.roomType, 40),
      moveInDate: clean(payload.moveInDate, 20) || null,
      smoking: lifestyle.has("non-smoker") ? "non-smoker" : null,
      pets: lifestyle.has("pet-friendly") ? "friendly" : null,
      cleanliness: lifestyle.has("very-tidy") ? 5 : null,
      sleepSchedule: lifestyle.has("early-sleeper") ? "early" : null,
      socialPreference: lifestyle.has("quiet-home") ? "quiet" : lifestyle.has("guests-okay") ? "social" : null,
    }).onConflictDoUpdate({
      target: preferences.userId,
      set: {
        minBudget, maxBudget, preferredCityId: city.id, preferredNeighborhoodId: neighborhood.id,
        roomType: clean(payload.roomType, 40), moveInDate: clean(payload.moveInDate, 20) || null,
        smoking: lifestyle.has("non-smoker") ? "non-smoker" : null,
        pets: lifestyle.has("pet-friendly") ? "friendly" : null,
        cleanliness: lifestyle.has("very-tidy") ? 5 : null,
        sleepSchedule: lifestyle.has("early-sleeper") ? "early" : null,
        socialPreference: lifestyle.has("quiet-home") ? "quiet" : lifestyle.has("guests-okay") ? "social" : null,
      },
    });

    return Response.json({ saved: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save profile.";
    return Response.json({ error: message }, { status: 500 });
  }
}
