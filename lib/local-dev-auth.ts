import { env } from "cloudflare:workers";
import { localDevAuthEnabled } from "@/lib/local-dev-guard.mjs";

export { localDevAuthEnabled };

export const LOCAL_DEV_SESSION_COOKIE = "debal_dev_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const PASSWORD_ITERATIONS = 120_000;
const encoder = new TextEncoder();

type LocalDevUser = { userId: string; email: string; displayName: string };

export function localDevSessionCookie(token: string) {
  return `${LOCAL_DEV_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;
}

export function clearLocalDevSessionCookie() {
  return `${LOCAL_DEV_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function localDevSessionToken(cookieHeader: string | null) {
  const value = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${LOCAL_DEV_SESSION_COOKIE}=`))?.slice(LOCAL_DEV_SESSION_COOKIE.length + 1);
  if (!value) return null;
  try {
    const token = decodeURIComponent(value);
    return /^[a-f0-9]{64}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}

export async function passwordCredentials(password: string) {
  const salt = randomHex(16);
  return { salt, hash: await passwordHash(password, salt) };
}

export async function passwordMatches(password: string, salt: string, expectedHash: string) {
  const actualHash = await passwordHash(password, salt);
  if (actualHash.length !== expectedHash.length) return false;
  let difference = 0;
  for (let index = 0; index < actualHash.length; index += 1) difference |= actualHash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  return difference === 0;
}

export async function createLocalDevSession(userId: string) {
  const token = randomHex(32);
  const sessionId = await sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_SECONDS * 1000).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM dev_sessions WHERE expires_at<=?").bind(now.toISOString()),
    env.DB.prepare("INSERT INTO dev_sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(sessionId, userId, expiresAt),
  ]);
  return token;
}

export async function localDevUser(cookieHeader: string | null): Promise<LocalDevUser | null> {
  const token = localDevSessionToken(cookieHeader);
  if (!token) return null;
  const sessionId = await sha256(token);
  return env.DB.prepare(`SELECT s.user_id AS userId,u.email,a.display_name AS displayName
    FROM dev_sessions s JOIN users u ON u.id=s.user_id JOIN dev_accounts a ON a.user_id=s.user_id
    WHERE s.id=? AND s.expires_at>? AND u.status='active'`)
    .bind(sessionId, new Date().toISOString()).first<LocalDevUser>();
}

export async function destroyLocalDevSession(cookieHeader: string | null) {
  const token = localDevSessionToken(cookieHeader);
  if (!token) return;
  await env.DB.prepare("DELETE FROM dev_sessions WHERE id=?").bind(await sha256(token)).run();
}

async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", iterations: PASSWORD_ITERATIONS, salt: fromHex(salt) }, key, 256);
  return toHex(new Uint8Array(bits));
}

async function sha256(value: string) {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

function randomHex(bytes: number) {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  return bytes;
}
