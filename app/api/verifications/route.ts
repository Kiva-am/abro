import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

const documentTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};
const maxBytes = 10 * 1024 * 1024;

function hasExpectedSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (type === "application/pdf") return [0x25, 0x50, 0x44, 0x46, 0x2d].every((value, index) => bytes[index] === value);
  return false;
}

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const [user, requests, listings] = await Promise.all([
      env.DB.prepare("SELECT identity_verified_at AS identityVerifiedAt FROM users WHERE id = ?")
        .bind(identity.userId).first<{ identityVerifiedAt: string | null }>(),
      env.DB.prepare(`SELECT vr.id,vr.type,vr.listing_id AS listingId,vr.document_key AS documentKey,vr.document_name AS documentName,
        vr.status,vr.moderator_note AS moderatorNote,vr.created_at AS createdAt,vr.updated_at AS updatedAt,
        l.title AS listingTitle FROM verification_requests vr LEFT JOIN listings l ON l.id=vr.listing_id
        WHERE vr.user_id=? ORDER BY vr.created_at DESC,vr.id DESC`).bind(identity.userId).all(),
      env.DB.prepare(`SELECT id,title,verification_status AS verificationStatus FROM listings
        WHERE owner_id=? AND status!='removed' ORDER BY created_at DESC,id DESC`).bind(identity.userId).all(),
    ]);
    return Response.json({
      identityVerifiedAt: user?.identityVerifiedAt ?? null,
      requests: requests.results,
      listings: listings.results,
    });
  } catch {
    return Response.json({ error: "Unable to load verification details." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });

  let uploadedKey = "";
  try {
    const form = await request.formData();
    const type = form.get("type");
    const document = form.get("document");
    const listingId = Number(form.get("listingId"));

    if (type !== "identity" && type !== "property") {
      return Response.json({ error: "Choose identity or property verification." }, { status: 400 });
    }
    if (!(document instanceof File) || document.size < 1) {
      return Response.json({ error: "Choose a document to upload." }, { status: 400 });
    }
    const extension = documentTypes[document.type];
    if (!extension) return Response.json({ error: "Use a JPG, PNG, or PDF document." }, { status: 400 });
    if (document.size > maxBytes) return Response.json({ error: "Your document must be 10 MB or smaller." }, { status: 400 });

    await env.DB.prepare(`INSERT INTO users (id,email) VALUES (?,?)
      ON CONFLICT(id) DO UPDATE SET email=excluded.email,updated_at=CURRENT_TIMESTAMP`)
      .bind(identity.userId, identity.email).run();

    let property: { id: number; verificationStatus: string } | null = null;
    if (type === "property") {
      if (!Number.isInteger(listingId) || listingId < 1) {
        return Response.json({ error: "Choose one of your properties." }, { status: 400 });
      }
      property = await env.DB.prepare(`SELECT id,verification_status AS verificationStatus FROM listings
        WHERE id=? AND owner_id=? AND status!='removed'`).bind(listingId, identity.userId)
        .first<{ id: number; verificationStatus: string }>();
      if (!property) return Response.json({ error: "Property not found." }, { status: 404 });
      if (property.verificationStatus === "verified") {
        return Response.json({ error: "This property is already verified." }, { status: 409 });
      }
    }

    const existing = await env.DB.prepare(`SELECT id,status FROM verification_requests
      WHERE user_id=? AND type=? AND ${type === "property" ? "listing_id=?" : "listing_id IS NULL"}
      AND status IN ('pending','approved') LIMIT 1`)
      .bind(...(type === "property" ? [identity.userId, type, listingId] : [identity.userId, type]))
      .first<{ id: number; status: string }>();
    if (existing) {
      const message = existing.status === "approved" ? "This verification is already approved." : "This verification is already being reviewed.";
      return Response.json({ error: message }, { status: 409 });
    }

    const documentBytes = new Uint8Array(await document.arrayBuffer());
    if (!hasExpectedSignature(documentBytes, document.type)) {
      return Response.json({ error: "The selected file does not match its document type." }, { status: 400 });
    }
    uploadedKey = `verification-${crypto.randomUUID()}.${extension}`;
    await env.MEDIA.put(uploadedKey, documentBytes, { httpMetadata: { contentType: document.type } });
    const insert = env.DB.prepare(`INSERT INTO verification_requests
      (user_id,type,listing_id,document_key,document_name,content_type)
      VALUES (?,?,?,?,?,?)`).bind(
      identity.userId,
      type,
      type === "property" ? listingId : null,
      uploadedKey,
      document.name.slice(0, 180) || `document.${extension}`,
      document.type,
    );

    if (type === "property") {
      await env.DB.batch([
        insert,
        env.DB.prepare(`UPDATE listings SET verification_status='pending',updated_at=CURRENT_TIMESTAMP
          WHERE id=? AND owner_id=?`).bind(listingId, identity.userId),
      ]);
    } else {
      await insert.run();
    }
    return Response.json({ submitted: true }, { status: 201 });
  } catch {
    if (uploadedKey) await env.MEDIA.delete(uploadedKey).catch(() => undefined);
    return Response.json({ error: "Unable to submit this document." }, { status: 500 });
  }
}
