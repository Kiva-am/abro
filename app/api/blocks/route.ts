import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export async function GET(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const userId = new URL(request.url).searchParams.get("userId")?.slice(0, 180) || "";
  if (!userId) return Response.json({ blocked: false });
  const row = await env.DB.prepare("SELECT id FROM blocked_users WHERE blocker_id=? AND blocked_user_id=?").bind(identity.userId, userId).first();
  return Response.json({ blocked: Boolean(row) });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const { userId } = await request.json() as { userId?: string };
    if (!userId || userId === identity.userId) return Response.json({ error: "This member cannot be blocked." }, { status: 400 });
    const person = await env.DB.prepare("SELECT id FROM users WHERE id=? AND status='active'").bind(userId).first();
    if (!person) return Response.json({ error: "Member not found." }, { status: 404 });
    await env.DB.prepare("INSERT INTO users (id,email) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email").bind(identity.userId, identity.email).run();
    await env.DB.prepare("INSERT INTO blocked_users (blocker_id,blocked_user_id) VALUES (?,?) ON CONFLICT(blocker_id,blocked_user_id) DO NOTHING").bind(identity.userId, userId).run();
    return Response.json({ blocked: true });
  } catch { return Response.json({ error: "Unable to block this member." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const { userId } = await request.json() as { userId?: string };
    await env.DB.prepare("DELETE FROM blocked_users WHERE blocker_id=? AND blocked_user_id=?").bind(identity.userId, userId || "").run();
    return Response.json({ blocked: false });
  } catch { return Response.json({ error: "Unable to unblock this member." }, { status: 500 }); }
}
