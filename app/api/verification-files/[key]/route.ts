import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export async function GET(_: Request, { params }: { params: Promise<{ key: string }> }) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const { key } = await params;
  if (!/^verification-[a-f0-9-]+\.(jpg|png|pdf)$/i.test(key)) return new Response("Not found", { status: 404 });

  const record = await env.DB.prepare(`SELECT vr.user_id AS userId,vr.content_type AS contentType,u.role,u.status
    FROM verification_requests vr LEFT JOIN users u ON u.id=? WHERE vr.document_key=? LIMIT 1`)
    .bind(identity.userId, key).first<{ userId: string; contentType: string; role: string | null; status: string | null }>();
  if (!record) return new Response("Not found", { status: 404 });
  const allowed = record.userId === identity.userId || (record.status === "active" && (record.role === "moderator" || record.role === "admin"));
  if (!allowed) return Response.json({ error: "You cannot view this document." }, { status: 403 });

  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": record.contentType || object.httpMetadata?.contentType || "application/octet-stream",
      "content-disposition": "inline",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
