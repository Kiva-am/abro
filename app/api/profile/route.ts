import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { locations, preferences, profiles, userIntents, users } from "@/db/schema";

const allowedIntents = ["find_home", "find_roommate", "list_property"] as const;
type UserIntent = typeof allowedIntents[number];

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
  intents?: string[];
};

function clean(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

type StoredProfile = {
  firstName: string; occupation: string | null; bio: string; citySlug: string | null; neighborhoodSlug: string | null;
  minBudget: number | null; maxBudget: number | null; roomType: string | null; moveInDate: string | null;
  smoking: string | null; pets: string | null; cleanliness: number | null; sleepSchedule: string | null; socialPreference: string | null;
};

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required to view a profile." }, { status: 401 });

  try {
    const [profile, intentResult] = await Promise.all([
      env.DB.prepare(`SELECT p.first_name AS firstName,p.occupation,p.bio,city.slug AS citySlug,
        neighborhood.slug AS neighborhoodSlug,pr.min_budget AS minBudget,pr.max_budget AS maxBudget,
        pr.room_type AS roomType,pr.move_in_date AS moveInDate,pr.smoking,pr.pets,pr.cleanliness,
        pr.sleep_schedule AS sleepSchedule,pr.social_preference AS socialPreference
        FROM profiles p
        LEFT JOIN locations city ON city.id=p.city_id
        LEFT JOIN locations neighborhood ON neighborhood.id=p.neighborhood_id
        LEFT JOIN preferences pr ON pr.user_id=p.user_id
        WHERE p.user_id=?`).bind(identity.userId).first<StoredProfile>(),
      env.DB.prepare("SELECT intent FROM user_intents WHERE user_id=? ORDER BY id").bind(identity.userId).all<{ intent: UserIntent }>(),
    ]);
    if (!profile) return Response.json({ profile: null });

    const lifestyle: string[] = [];
    if (profile.smoking === "non-smoker") lifestyle.push("non-smoker");
    if (profile.pets === "friendly") lifestyle.push("pet-friendly");
    if (profile.socialPreference === "quiet") lifestyle.push("quiet-home");
    if (profile.sleepSchedule === "early") lifestyle.push("early-sleeper");
    if (profile.socialPreference === "social") lifestyle.push("guests-okay");
    if (profile.cleanliness === 5) lifestyle.push("very-tidy");

    return Response.json({
      profile: {
        intents: intentResult.results.map((item) => item.intent),
        firstName: profile.firstName,
        occupation: profile.occupation ?? "",
        bio: profile.bio,
        citySlug: profile.citySlug ?? "addis-ababa",
        neighborhoodSlug: profile.neighborhoodSlug ?? "addis-ababa-arada",
        minBudget: profile.minBudget ?? 0,
        maxBudget: profile.maxBudget ?? 0,
        roomType: profile.roomType ?? "private_room",
        moveInDate: profile.moveInDate ?? "",
        lifestyle,
      },
    });
  } catch {
    return Response.json({ error: "Unable to load your profile right now." }, { status: 500 });
  }
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
    const intents = [...new Set((Array.isArray(payload.intents) ? payload.intents : []).filter(
      (intent): intent is UserIntent => allowedIntents.includes(intent as UserIntent),
    ))];

    if (!intents.length) {
      return Response.json({ error: "Choose at least one way you want to use Debal." }, { status: 400 });
    }
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

    await db.delete(userIntents).where(eq(userIntents.userId, identity.userId));
    await db.insert(userIntents).values(intents.map((intent) => ({ userId: identity.userId, intent })));

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
