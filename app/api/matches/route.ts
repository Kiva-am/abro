import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

type Preference = {
  userId: string;
  firstName: string | null;
  bio: string | null;
  occupation: string | null;
  gender: string | null;
  city: string | null;
  neighborhood: string | null;
  minBudget: number | null;
  maxBudget: number | null;
  roomType: string | null;
  roommateGender: string | null;
  moveInDate: string | null;
  smoking: string | null;
  pets: string | null;
  cleanliness: number | null;
  sleepSchedule: string | null;
  socialPreference: string | null;
};

type MatchPayload = {
  minBudget?: number;
  maxBudget?: number;
  roomType?: string;
  roommateGender?: string;
  moveInDate?: string;
  smoking?: string;
  pets?: string;
  cleanliness?: number;
  sleepSchedule?: string;
  socialPreference?: string;
};

function overlap(aMin: number | null, aMax: number | null, bMin: number | null, bMax: number | null) {
  if (!aMax || !bMax) return 50;
  const left = Math.max(aMin || 0, bMin || 0);
  const right = Math.min(aMax, bMax);
  if (right >= left) return 100;
  const gap = left - right;
  return Math.max(0, 100 - gap / Math.max(aMax, bMax) * 200);
}

function same(a: unknown, b: unknown, fallback = 50) {
  return !a || !b ? fallback : a === b ? 100 : 20;
}

function dateScore(a: string | null, b: string | null) {
  if (!a || !b) return 50;
  const days = Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
  return days <= 14 ? 100 : days <= 30 ? 75 : days <= 60 ? 45 : 15;
}

function score(current: Preference, candidate: Preference) {
  const location = current.neighborhood && candidate.neighborhood && current.neighborhood === candidate.neighborhood
    ? 100
    : same(current.city, candidate.city, 30);
  const budget = overlap(current.minBudget, current.maxBudget, candidate.minBudget, candidate.maxBudget);
  const lifestyle = [
    same(current.smoking, candidate.smoking),
    same(current.pets, candidate.pets),
    same(current.sleepSchedule, candidate.sleepSchedule),
    same(current.socialPreference, candidate.socialPreference),
    current.cleanliness && candidate.cleanliness
      ? Math.max(0, 100 - Math.abs(current.cleanliness - candidate.cleanliness) * 20)
      : 50,
  ].reduce((total, value) => total + value, 0) / 5;
  const move = dateScore(current.moveInDate, candidate.moveInDate);
  const room = same(current.roomType, candidate.roomType);
  const roommate = !current.roommateGender || current.roommateGender === "any"
    ? 100
    : same(current.roommateGender, candidate.gender, 40);
  const preferences = (room + roommate) / 2;
  const total = Math.round(location * .25 + budget * .20 + lifestyle * .20 + move * .15 + preferences * .20);
  const reasons: string[] = [];
  if (location >= 90) reasons.push("Same preferred neighborhood");
  else if (location >= 70) reasons.push("Same city");
  if (budget >= 80) reasons.push("Overlapping budgets");
  if (current.smoking && current.smoking === candidate.smoking) reasons.push("Same smoking preference");
  if (current.sleepSchedule && current.sleepSchedule === candidate.sleepSchedule) reasons.push("Similar sleep schedule");
  if (current.socialPreference && current.socialPreference === candidate.socialPreference) reasons.push("Similar home atmosphere");
  if (move >= 75) reasons.push("Compatible move-in timing");
  return {
    score: total,
    reasons: reasons.slice(0, 4),
    breakdown: {
      location: Math.round(location),
      budget: Math.round(budget),
      lifestyle: Math.round(lifestyle),
      moveIn: Math.round(move),
      room: Math.round(preferences),
    },
  };
}

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const rows = await env.DB.prepare(`SELECT p.user_id AS userId,p.first_name AS firstName,p.bio,p.occupation,p.gender,
      city.name AS city,neighborhood.name AS neighborhood,pr.min_budget AS minBudget,pr.max_budget AS maxBudget,
      pr.room_type AS roomType,pr.roommate_gender AS roommateGender,pr.move_in_date AS moveInDate,pr.smoking,pr.pets,
      pr.cleanliness,pr.sleep_schedule AS sleepSchedule,pr.social_preference AS socialPreference
      FROM profiles p JOIN users u ON u.id=p.user_id AND u.status='active'
      LEFT JOIN preferences pr ON pr.user_id=p.user_id LEFT JOIN locations city ON city.id=p.city_id
      LEFT JOIN locations neighborhood ON neighborhood.id=p.neighborhood_id
      WHERE NOT EXISTS (SELECT 1 FROM blocked_users b WHERE
        (b.blocker_id=? AND b.blocked_user_id=p.user_id) OR (b.blocker_id=p.user_id AND b.blocked_user_id=?))`)
      .bind(identity.userId, identity.userId).all<Preference>();
    const current = rows.results.find((row) => row.userId === identity.userId);
    if (!current) return Response.json({ needsProfile: true, matches: [] });
    const matches = rows.results
      .filter((row) => row.userId !== identity.userId)
      .map((person) => ({ ...person, ...score(current, person) }))
      .sort((a, b) => b.score - a.score);
    return Response.json({ current, matches });
  } catch {
    return Response.json({ error: "Unable to calculate matches." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const payload = await request.json() as MatchPayload;
    const min = Math.max(0, Number(payload.minBudget) || 0);
    const max = Math.max(0, Number(payload.maxBudget) || 0);
    if (!max || min > max) return Response.json({ error: "Enter a valid budget range." }, { status: 400 });
    const choices = {
      roomType: new Set(["private_room", "shared_room", "apartment", "house"]),
      roommateGender: new Set(["any", "female", "male"]),
      smoking: new Set(["non-smoker", "outside-only", "no-preference"]),
      pets: new Set(["friendly", "no-pets", "no-preference"]),
      sleepSchedule: new Set(["early", "late", "flexible"]),
      socialPreference: new Set(["quiet", "balanced", "social"]),
    };
    const roomType = choices.roomType.has(payload.roomType || "") ? payload.roomType! : "private_room";
    const roommateGender = choices.roommateGender.has(payload.roommateGender || "") ? payload.roommateGender! : "any";
    const smoking = choices.smoking.has(payload.smoking || "") ? payload.smoking! : "no-preference";
    const pets = choices.pets.has(payload.pets || "") ? payload.pets! : "no-preference";
    const sleepSchedule = choices.sleepSchedule.has(payload.sleepSchedule || "") ? payload.sleepSchedule! : "flexible";
    const socialPreference = choices.socialPreference.has(payload.socialPreference || "") ? payload.socialPreference! : "balanced";
    const moveInDate = /^\d{4}-\d{2}-\d{2}$/.test(payload.moveInDate || "") ? payload.moveInDate! : "";
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id,email) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email")
        .bind(identity.userId, identity.email),
      env.DB.prepare(`INSERT INTO preferences
        (user_id,min_budget,max_budget,room_type,roommate_gender,move_in_date,smoking,pets,cleanliness,sleep_schedule,social_preference)
        VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET min_budget=excluded.min_budget,
        max_budget=excluded.max_budget,room_type=excluded.room_type,roommate_gender=excluded.roommate_gender,
        move_in_date=excluded.move_in_date,smoking=excluded.smoking,pets=excluded.pets,cleanliness=excluded.cleanliness,
        sleep_schedule=excluded.sleep_schedule,social_preference=excluded.social_preference`)
        .bind(identity.userId, min, max, roomType, roommateGender, moveInDate, smoking, pets,
          Math.min(5, Math.max(1, Number(payload.cleanliness) || 3)), sleepSchedule, socialPreference),
    ]);
    return Response.json({ saved: true });
  } catch {
    return Response.json({ error: "Unable to save matching preferences." }, { status: 500 });
  }
}
