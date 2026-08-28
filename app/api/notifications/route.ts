import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export async function GET(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const url = new URL(request.url);
    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM notifications WHERE user_id=? AND read_at IS NULL")
      .bind(identity.userId).first<{ total: number }>();
    if (url.searchParams.get("summary") === "1") return Response.json({ unreadCount: count?.total ?? 0 });
    const result = await env.DB.prepare(`SELECT id,type,title,body,href,read_at AS readAt,created_at AS createdAt
      FROM notifications WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 150`).bind(identity.userId).all();
    return Response.json({ notifications: result.results, unreadCount: count?.total ?? 0 });
  } catch {
    return Response.json({ error: "Unable to load notifications." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const payload = await request.json() as { id?: number; all?: boolean };
    if (payload.all === true) {
      await env.DB.prepare("UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE user_id=? AND read_at IS NULL")
        .bind(identity.userId).run();
      return Response.json({ updated: true, unreadCount: 0 });
    }
    const id = Number(payload.id);
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Choose a valid notification." }, { status: 400 });
    const result = await env.DB.prepare("UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE id=? AND user_id=?")
      .bind(id, identity.userId).run();
    if (!result.meta.changes) return Response.json({ error: "Notification not found." }, { status: 404 });
    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM notifications WHERE user_id=? AND read_at IS NULL")
      .bind(identity.userId).first<{ total: number }>();
    return Response.json({ updated: true, unreadCount: count?.total ?? 0 });
  } catch {
    return Response.json({ error: "Unable to update notifications." }, { status: 500 });
  }
}
