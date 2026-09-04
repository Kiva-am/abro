import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { notificationStatement } from "@/lib/notifications";

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const result = await env.DB.prepare(`SELECT ro.id,ro.application_id AS applicationId,ro.listing_id AS listingId,
      ro.renter_id AS renterId,ro.owner_id AS ownerId,ro.monthly_rent AS monthlyRent,ro.deposit,
      ro.move_in_date AS moveInDate,ro.lease_months AS leaseMonths,ro.terms,ro.status,
      ro.renter_accepted_at AS renterAcceptedAt,ro.created_at AS createdAt,l.title AS listingTitle,
      city.name AS city,neighborhood.name AS neighborhood,renter.first_name AS renterName,owner.first_name AS ownerName,
      CASE WHEN ro.renter_id=? THEN 'incoming' ELSE 'outgoing' END AS direction
      FROM rental_offers ro JOIN listings l ON l.id=ro.listing_id
      JOIN locations city ON city.id=l.city_id LEFT JOIN locations neighborhood ON neighborhood.id=l.neighborhood_id
      LEFT JOIN profiles renter ON renter.user_id=ro.renter_id LEFT JOIN profiles owner ON owner.user_id=ro.owner_id
      WHERE ro.renter_id=? OR ro.owner_id=? ORDER BY ro.created_at DESC,ro.id DESC LIMIT 100`)
      .bind(identity.userId, identity.userId, identity.userId).all();
    await env.DB.prepare("UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE user_id=? AND type='offer' AND read_at IS NULL")
      .bind(identity.userId).run();
    return Response.json({ offers: result.results });
  } catch {
    return Response.json({ error: "Unable to load rental offers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const payload = await request.json() as { applicationId?: number; monthlyRent?: number; deposit?: number; moveInDate?: string; leaseMonths?: number; terms?: string };
    const applicationId = Number(payload.applicationId);
    const monthlyRent = Number(payload.monthlyRent);
    const deposit = Number(payload.deposit);
    const leaseMonths = Number(payload.leaseMonths);
    const moveInDate = typeof payload.moveInDate === "string" ? payload.moveInDate : "";
    const terms = typeof payload.terms === "string" ? payload.terms.trim().slice(0, 1500) : "";
    if (!Number.isInteger(applicationId) || applicationId < 1) return Response.json({ error: "Choose a valid accepted application." }, { status: 400 });
    if (!Number.isInteger(monthlyRent) || monthlyRent < 1 || monthlyRent > 100_000_000) return Response.json({ error: "Enter a valid monthly rent." }, { status: 400 });
    if (!Number.isInteger(deposit) || deposit < 0 || deposit > 200_000_000) return Response.json({ error: "Enter a valid deposit." }, { status: 400 });
    if (!Number.isInteger(leaseMonths) || leaseMonths < 1 || leaseMonths > 60) return Response.json({ error: "Lease length must be between 1 and 60 months." }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(moveInDate)) return Response.json({ error: "Choose a move-in date." }, { status: 400 });
    const moveTime = new Date(`${moveInDate}T00:00:00Z`).getTime(); const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    if (!Number.isFinite(moveTime) || moveTime < today.getTime() || moveTime > today.getTime() + 366 * 24 * 60 * 60 * 1000) return Response.json({ error: "Choose a move-in date within the next year." }, { status: 400 });

    const application = await env.DB.prepare(`SELECT a.id,a.listing_id AS listingId,a.renter_id AS renterId,a.owner_id AS ownerId,
      a.status,l.title,l.status AS listingStatus FROM rental_applications a JOIN listings l ON l.id=a.listing_id
      WHERE a.id=? AND a.owner_id=?`).bind(applicationId, identity.userId)
      .first<{ id: number; listingId: number; renterId: string; ownerId: string; status: string; title: string; listingStatus: string }>();
    if (!application) return Response.json({ error: "Accepted application not found." }, { status: 404 });
    if (application.status !== "accepted") return Response.json({ error: "Accept the renter's application before sending an offer." }, { status: 409 });
    if (application.listingStatus === "rented" || application.listingStatus === "removed") return Response.json({ error: "This property is no longer available for a new offer." }, { status: 409 });
    const existing = await env.DB.prepare("SELECT id FROM rental_offers WHERE application_id=?").bind(applicationId).first();
    if (existing) return Response.json({ error: "A rental offer already exists for this application." }, { status: 409 });

    await env.DB.batch([
      env.DB.prepare(`INSERT INTO rental_offers
        (application_id,listing_id,renter_id,owner_id,monthly_rent,deposit,move_in_date,lease_months,terms)
        VALUES (?,?,?,?,?,?,?,?,?)`).bind(applicationId, application.listingId, application.renterId, application.ownerId, monthlyRent, deposit, moveInDate, leaseMonths, terms),
      notificationStatement(application.renterId, "offer", "New rental offer", `The owner sent you a rental offer for ${application.title}.`, "/rental-offers"),
    ]);
    return Response.json({ created: true }, { status: 201 });
  } catch {
    return Response.json({ error: "Unable to create this rental offer." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const payload = await request.json() as { id?: number; status?: string };
    const id = Number(payload.id); const status = payload.status;
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Choose a valid rental offer." }, { status: 400 });
    const offer = await env.DB.prepare(`SELECT ro.id,ro.listing_id AS listingId,ro.renter_id AS renterId,
      ro.owner_id AS ownerId,ro.status,l.title FROM rental_offers ro JOIN listings l ON l.id=ro.listing_id WHERE ro.id=?`)
      .bind(id).first<{ id: number; listingId: number; renterId: string; ownerId: string; status: string; title: string }>();
    if (!offer || (offer.renterId !== identity.userId && offer.ownerId !== identity.userId)) return Response.json({ error: "Rental offer not found." }, { status: 404 });
    if (offer.status !== "offered") return Response.json({ error: "This offer has already been decided." }, { status: 409 });

    if (offer.renterId === identity.userId) {
      if (status !== "accepted" && status !== "declined") return Response.json({ error: "Choose accept or decline." }, { status: 400 });
      const updates = [
        env.DB.prepare(`UPDATE rental_offers SET status=?,renter_accepted_at=${status === "accepted" ? "CURRENT_TIMESTAMP" : "NULL"},updated_at=CURRENT_TIMESTAMP
          WHERE id=? AND renter_id=? AND status='offered'`).bind(status, id, identity.userId),
        env.DB.prepare(`INSERT INTO notifications (user_id,type,title,body,href)
          SELECT ?,'offer',?,?,'/rental-offers' WHERE EXISTS
          (SELECT 1 FROM rental_offers WHERE id=? AND renter_id=? AND status=?)`)
          .bind(offer.ownerId, status === "accepted" ? "Rental offer accepted" : "Rental offer declined", `The renter ${status} your offer for ${offer.title}.`, id, identity.userId, status),
      ];
      if (status === "accepted") updates.push(env.DB.prepare("UPDATE listings SET status='rented',updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_id=? AND status!='removed'").bind(offer.listingId, offer.ownerId));
      const results = await env.DB.batch(updates);
      if (!results[0].meta.changes) return Response.json({ error: "This offer changed before your decision. Refresh and try again." }, { status: 409 });
      return Response.json({ updated: true, status });
    }

    if (status !== "withdrawn") return Response.json({ error: "Owners can only withdraw a pending offer." }, { status: 400 });
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE rental_offers SET status='withdrawn',updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_id=? AND status='offered'").bind(id, identity.userId),
      env.DB.prepare(`INSERT INTO notifications (user_id,type,title,body,href)
        SELECT ?,'offer','Rental offer withdrawn',?,'/rental-offers' WHERE EXISTS
        (SELECT 1 FROM rental_offers WHERE id=? AND owner_id=? AND status='withdrawn')`)
        .bind(offer.renterId, `The owner withdrew the rental offer for ${offer.title}.`, id, identity.userId),
    ]);
    if (!results[0].meta.changes) return Response.json({ error: "This offer changed before it could be withdrawn. Refresh and try again." }, { status: 409 });
    return Response.json({ updated: true, status });
  } catch {
    return Response.json({ error: "Unable to update this rental offer." }, { status: 500 });
  }
}
