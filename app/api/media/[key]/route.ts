import { env } from "cloudflare:workers";

export async function GET(_: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[a-zA-Z0-9._-]{1,180}$/.test(key)) return new Response("Not found", { status: 404 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      etag: object.httpEtag,
    },
  });
}
