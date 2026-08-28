import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

const imageTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const maxFiles = 6;
const maxBytes = 8 * 1024 * 1024;

async function ownedListing(id: number, userId: string) {
  return env.DB.prepare("SELECT id FROM listings WHERE id = ? AND owner_id = ?").bind(id, userId).first<{ id: number }>();
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const { id: rawId } = await params;
  const listingId = Number(rawId);
  if (!Number.isInteger(listingId) || listingId < 1 || !await ownedListing(listingId, identity.userId)) {
    return Response.json({ error: "Listing not found." }, { status: 404 });
  }

  try {
    const form = await request.formData();
    const files = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM listing_photos WHERE listing_id = ?").bind(listingId).first<{ total: number }>();
    if (!files.length) return Response.json({ error: "Choose at least one photo." }, { status: 400 });
    if ((count?.total ?? 0) + files.length > maxFiles) return Response.json({ error: `A listing can have up to ${maxFiles} photos.` }, { status: 400 });
    for (const file of files) {
      if (!imageTypes[file.type]) return Response.json({ error: "Use JPG, PNG, or WebP photos." }, { status: 400 });
      if (file.size > maxBytes) return Response.json({ error: "Each photo must be 8 MB or smaller." }, { status: 400 });
    }

    const uploaded: string[] = [];
    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const key = `listing-${listingId}-${crypto.randomUUID()}.${imageTypes[file.type]}`;
        await env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
        uploaded.push(key);
      }
      await env.DB.batch(uploaded.map((key, index) => env.DB.prepare(
        "INSERT INTO listing_photos (listing_id, storage_key, alt_text, sort_order) VALUES (?, ?, ?, ?)"
      ).bind(listingId, key, `Photo of listing ${listingId}`, (count?.total ?? 0) + index)));
    } catch (error) {
      await Promise.all(uploaded.map((key) => env.MEDIA.delete(key)));
      throw error;
    }
    return Response.json({ uploaded: uploaded.length });
  } catch {
    return Response.json({ error: "Unable to upload these photos." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const { id: rawId } = await params;
    const listingId = Number(rawId);
    const { photoId } = await request.json() as { photoId?: number };
    const photo = await env.DB.prepare(`SELECT lp.id, lp.storage_key AS storageKey FROM listing_photos lp
      JOIN listings l ON l.id = lp.listing_id WHERE lp.id = ? AND lp.listing_id = ? AND l.owner_id = ?`)
      .bind(Number(photoId), listingId, identity.userId).first<{ id: number; storageKey: string }>();
    if (!photo) return Response.json({ error: "Photo not found." }, { status: 404 });
    await env.MEDIA.delete(photo.storageKey);
    await env.DB.prepare("DELETE FROM listing_photos WHERE id = ?").bind(photo.id).run();
    return Response.json({ removed: true });
  } catch {
    return Response.json({ error: "Unable to remove this photo." }, { status: 500 });
  }
}
