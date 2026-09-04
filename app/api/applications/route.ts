import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { notificationStatement } from "@/lib/notifications";

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const result = await env.DB.prepare(`SELECT a.id,a.listing_id AS listingId,a.renter_id AS renterId,a.owner_id AS ownerId,
      a.message,a.move_in_date AS moveInDate,a.occupants,a.status,a.created_at AS createdAt,
      l.title AS listingTitle,l.status AS listingStatus,l.monthly_rent AS monthlyRent,
      city.name AS city,neighborhood.name AS neighborhood,
      (SELECT storage_key FROM listing_photos WHERE listing_id=l.id ORDER BY sort_order,id LIMIT 1) AS photoKey,
      (SELECT status FROM rental_offers WHERE application_id=a.id LIMIT 1) AS offerStatus,
      renter.first_name AS renterName,renter.occupation AS renterOccupation,renter.bio AS renterBio,
      renter_user.identity_verified_at AS renterVerifiedAt,owner.first_name AS ownerName,
      CASE WHEN a.owner_id=? THEN 'incoming' ELSE 'outgoing' END AS direction
      FROM rental_applications a JOIN listings l ON l.id=a.listing_id
      JOIN locations city ON city.id=l.city_id LEFT JOIN locations neighborhood ON neighborhood.id=l.neighborhood_id
      LEFT JOIN profiles renter ON renter.user_id=a.renter_id LEFT JOIN users renter_user ON renter_user.id=a.renter_id
      LEFT JOIN profiles owner ON owner.user_id=a.owner_id
      WHERE a.owner_id=? OR a.renter_id=?
      ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'shortlisted' THEN 1 WHEN 'accepted' THEN 2 ELSE 3 END,
      a.created_at DESC,a.id DESC LIMIT 200`)
      .bind(identity.userId, identity.userId, identity.userId).all();
    await env.DB.prepare("UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE user_id=? AND type='application' AND read_at IS NULL").bind(identity.userId).run();
    return Response.json({ applications: result.results });
  } catch {
    return Response.json({ error: "Unable to load rental applications." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const payload = await request.json() as { listingId?: number; message?: string; moveInDate?: string; occupants?: number };
    const listingId = Number(payload.listingId);
    const message = typeof payload.message === "string" ? payload.message.trim().slice(0, 800) : "";
    const moveInDate = typeof payload.moveInDate === "string" ? payload.moveInDate : "";
    const occupants = Number(payload.occupants);
    if (!Number.isInteger(listingId) || listingId < 1) return Response.json({ error: "Choose a valid property." }, { status: 400 });
    if (message.length < 20) return Response.json({ error: "Tell the owner a little about yourself in at least 20 characters." }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(moveInDate)) return Response.json({ error: "Choose your intended move-in date." }, { status: 400 });
    const moveTime = new Date(`${moveInDate}T00:00:00Z`).getTime();
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    if (!Number.isFinite(moveTime) || moveTime < today.getTime() || moveTime > today.getTime() + 366 * 24 * 60 * 60 * 1000) {
      return Response.json({ error: "Choose a move-in date within the next year." }, { status: 400 });
    }
    if (!Number.isInteger(occupants) || occupants < 1 || occupants > 12) return Response.json({ error: "Occupants must be between 1 and 12." }, { status: 400 });

    const listing = await env.DB.prepare("SELECT id,owner_id AS ownerId,title FROM listings WHERE id=? AND status='active'")
      .bind(listingId).first<{ id: number; ownerId: string; title: string }>();
    if (!listing) return Response.json({ error: "This property is no longer available." }, { status: 404 });
    if (listing.ownerId === identity.userId) return Response.json({ error: "You cannot apply for your own property." }, { status: 400 });
    const blocked = await env.DB.prepare(`SELECT id FROM blocked_users WHERE
      (blocker_id=? AND blocked_user_id=?) OR (blocker_id=? AND blocked_user_id=?) LIMIT 1`)
      .bind(identity.userId, listing.ownerId, listing.ownerId, identity.userId).first();
    if (blocked) return Response.json({ error: "Applications are unavailable for this property." }, { status: 403 });

    await env.DB.prepare(`INSERT INTO users (id,email) VALUES (?,?)
      ON CONFLICT(id) DO UPDATE SET email=excluded.email,updated_at=CURRENT_TIMESTAMP`)
      .bind(identity.userId, identity.email).run();
    const existing = await env.DB.prepare("SELECT id,status FROM rental_applications WHERE listing_id=? AND renter_id=?")
      .bind(listingId, identity.userId).first<{ id: number; status: string }>();
    if (existing) return Response.json({ error: "You already applied for this property. Track it from Applications." }, { status: 409 });

    await env.DB.batch([
      env.DB.prepare(`INSERT INTO rental_applications
        (listing_id,renter_id,owner_id,message,move_in_date,occupants) VALUES (?,?,?,?,?,?)`)
        .bind(listingId, identity.userId, listing.ownerId, message, moveInDate, occupants),
      notificationStatement(listing.ownerId, "application", "New rental application", `A renter applied for ${listing.title}.`, "/applications"),
    ]);
    return Response.json({ created: true }, { status: 201 });
  } catch {
    return Response.json({ error: "Unable to submit this application." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const payload = await request.json() as { id?: number; status?: string };
    const id = Number(payload.id);
    const status = payload.status;
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Choose a valid application." }, { status: 400 });
    const item = await env.DB.prepare(`SELECT a.id,a.listing_id AS listingId,a.renter_id AS renterId,
      a.owner_id AS ownerId,a.status,l.title FROM rental_applications a JOIN listings l ON l.id=a.listing_id WHERE a.id=?`)
      .bind(id).first<{ id: number; listingId: number; renterId: string; ownerId: string; status: string; title: string }>();
    if (!item) return Response.json({ error: "Application not found." }, { status: 404 });

    if (item.ownerId === identity.userId) {
      if (status !== "shortlisted" && status !== "accepted" && status !== "declined") return Response.json({ error: "Choose a valid owner decision." }, { status: 400 });
      if (item.status !== "pending" && item.status !== "shortlisted") return Response.json({ error: "This application can no longer be changed." }, { status: 409 });
      const update = env.DB.prepare("UPDATE rental_applications SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_id=? AND status IN ('pending','shortlisted')")
        .bind(status, id, identity.userId);
      if (status === "accepted") {
        const results = await env.DB.batch([
          update,
          env.DB.prepare(`INSERT INTO notifications (user_id,type,title,body,href)
            SELECT ?,'application','Application accepted',?,'/applications'
            WHERE EXISTS (SELECT 1 FROM rental_applications WHERE id=? AND owner_id=? AND status='accepted')`)
            .bind(item.renterId, `The owner accepted your application for ${item.title}.`, id, identity.userId),
          env.DB.prepare(`INSERT INTO notifications (user_id,type,title,body,href)
            SELECT renter_id,'application','Application update',?,'/applications' FROM rental_applications
            WHERE listing_id=? AND id!=? AND status IN ('pending','shortlisted')
            AND EXISTS (SELECT 1 FROM rental_applications WHERE id=? AND owner_id=? AND status='accepted')`)
            .bind(`Another applicant was selected for ${item.title}.`, item.listingId, id, id, identity.userId),
          env.DB.prepare(`UPDATE rental_applications SET status='declined',updated_at=CURRENT_TIMESTAMP
            WHERE listing_id=? AND id!=? AND status IN ('pending','shortlisted')
            AND EXISTS (SELECT 1 FROM rental_applications WHERE id=? AND owner_id=? AND status='accepted')`)
            .bind(item.listingId, id, id, identity.userId),
        ]);
        if (!results[0].meta.changes) return Response.json({ error: "This application changed before your decision. Refresh and try again." }, { status: 409 });
      } else {
        const results = await env.DB.batch([
          update,
          env.DB.prepare(`INSERT INTO notifications (user_id,type,title,body,href)
            SELECT ?,'application',?,?,'/applications'
            WHERE EXISTS (SELECT 1 FROM rental_applications WHERE id=? AND owner_id=? AND status=?)`)
            .bind(item.renterId, status === "shortlisted" ? "You were shortlisted" : "Application update", status === "shortlisted" ? `The owner shortlisted your application for ${item.title}.` : `The owner declined your application for ${item.title}.`, id, identity.userId, status),
        ]);
        if (!results[0].meta.changes) return Response.json({ error: "This application changed before your decision. Refresh and try again." }, { status: 409 });
      }
      return Response.json({ updated: true, status });
    }
    if (item.renterId === identity.userId) {
      if (status !== "withdrawn") return Response.json({ error: "Renters can only withdraw an application." }, { status: 400 });
      if (item.status !== "pending" && item.status !== "shortlisted") return Response.json({ error: "This application can no longer be withdrawn." }, { status: 409 });
      const results = await env.DB.batch([
        env.DB.prepare(`UPDATE rental_applications SET status='withdrawn',updated_at=CURRENT_TIMESTAMP
          WHERE id=? AND renter_id=? AND status IN ('pending','shortlisted')`).bind(id, identity.userId),
        env.DB.prepare(`INSERT INTO notifications (user_id,type,title,body,href)
          SELECT ?,'application','Application withdrawn',?,'/applications'
          WHERE EXISTS (SELECT 1 FROM rental_applications WHERE id=? AND renter_id=? AND status='withdrawn')`)
          .bind(item.ownerId, `A renter withdrew their application for ${item.title}.`, id, identity.userId),
      ]);
      if (!results[0].meta.changes) return Response.json({ error: "This application changed before it could be withdrawn. Refresh and try again." }, { status: 409 });
      return Response.json({ updated: true, status });
    }
    return Response.json({ error: "You cannot manage this application." }, { status: 403 });
  } catch {
    return Response.json({ error: "Unable to update this application." }, { status: 500 });
  }
}
