"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import NotificationLink from "@/app/components/notification-link";

type OfferStatus = "offered" | "accepted" | "declined" | "withdrawn";
type RentalOffer = {
  id: number; applicationId: number; listingId: number; renterId: string; ownerId: string;
  monthlyRent: number; deposit: number; moveInDate: string; leaseMonths: number; terms: string;
  status: OfferStatus; renterAcceptedAt: string | null; createdAt: string; listingTitle: string;
  city: string; neighborhood: string | null; renterName: string | null; ownerName: string | null;
  direction: "incoming" | "outgoing";
};

const statusCopy: Record<OfferStatus, string> = {
  offered: "Waiting for renter",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

export default function RentalOffersPage() {
  const [items, setItems] = useState<RentalOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/rental-offers").then(async (response) => {
      const text = await response.text();
      const data = text ? JSON.parse(text) as { offers?: RentalOffer[]; error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Unable to load rental offers.");
      if (active) setItems(data.offers ?? []);
    }).catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : "Unable to load rental offers.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function update(item: RentalOffer, status: OfferStatus) {
    if (status === "accepted" && !window.confirm("Accept this rental offer? The property will be marked as rented.")) return;
    setUpdating(item.id); setError("");
    try {
      const response = await fetch("/api/rental-offers", {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, status }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) as { error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Unable to update this offer.");
      setItems((current) => current.map((entry) => entry.id === item.id
        ? { ...entry, status, renterAcceptedAt: status === "accepted" ? new Date().toISOString() : entry.renterAcceptedAt }
        : entry));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update this offer.");
    } finally { setUpdating(null); }
  }

  const received = useMemo(() => items.filter((item) => item.direction === "incoming"), [items]);
  const sent = useMemo(() => items.filter((item) => item.direction === "outgoing"), [items]);

  const section = (title: string, subtitle: string, offers: RentalOffer[]) => <section className="offer-group">
    <div className="viewing-group-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><span>{offers.length}</span></div>
    {offers.length === 0 ? <div className="viewing-empty">No rental offers here yet.</div> : <div className="offer-list">
      {offers.map((item) => <article className="offer-card" key={item.id}>
        <div className="offer-card-heading">
          <div><span className={`status-pill ${item.status}`}>{statusCopy[item.status]}</span><small>{item.neighborhood ? `${item.neighborhood}, ` : ""}{item.city}</small></div>
          <strong>{Number(item.monthlyRent).toLocaleString()} ETB <small>/ month</small></strong>
        </div>
        <h3>{item.listingTitle}</h3>
        <p className="offer-person">{item.direction === "incoming" ? `From ${item.ownerName || "the property owner"}` : `For ${item.renterName || "the accepted renter"}`}</p>
        <dl className="offer-terms">
          <div><dt>Deposit</dt><dd>{Number(item.deposit).toLocaleString()} ETB</dd></div>
          <div><dt>Move-in</dt><dd>{new Date(`${item.moveInDate}T00:00:00`).toLocaleDateString([], { dateStyle: "medium" })}</dd></div>
          <div><dt>Lease term</dt><dd>{item.leaseMonths} month{item.leaseMonths === 1 ? "" : "s"}</dd></div>
        </dl>
        <div className="offer-notes"><strong>Important terms</strong><p>{item.terms || "No additional terms were added."}</p></div>
        {item.status === "accepted" && <p className="offer-result accepted">✓ Offer accepted. This property is now marked as rented.</p>}
        {item.status === "declined" && <p className="offer-result declined">The renter declined this offer.</p>}
        {item.status === "withdrawn" && <p className="offer-result withdrawn">The owner withdrew this offer.</p>}
        <div className="offer-actions">
          <Link href={`/listings/${item.listingId}`}>View property</Link>
          <Link href={`/messages/${item.direction === "incoming" ? item.ownerId : item.renterId}`}>Message</Link>
          {item.direction === "incoming" && item.status === "offered" && <>
            <button className="offer-accept" disabled={updating === item.id} onClick={() => void update(item, "accepted")}>Accept offer</button>
            <button disabled={updating === item.id} onClick={() => void update(item, "declined")}>Decline</button>
          </>}
          {item.direction === "outgoing" && item.status === "offered" && <button disabled={updating === item.id} onClick={() => void update(item, "withdrawn")}>Withdraw offer</button>}
        </div>
      </article>)}
    </div>}
  </section>;

  return <main className="offers-page">
    <header className="site-header shell market-header">
      <Link className="brand" href="/"><span className="brand-logo" /></Link>
      <nav><Link href="/listings">Browse homes</Link><Link href="/applications">Applications</Link><Link href="/viewings">Viewings</Link><Link href="/dashboard">My properties</Link><Link href="/messages">Messages</Link></nav>
      <div className="header-actions"><NotificationLink /><Link className="button button-dark" href="/applications">Applications</Link></div>
    </header>
    <div className="offers-shell shell">
      <div className="viewings-heading"><span className="eyebrow">RENTAL OFFERS</span><h1>Agree on the essentials.</h1><p>After an application is accepted, owners can share the proposed rent, deposit, move-in date, lease length, and important terms.</p></div>
      <aside className="offer-guidance"><strong>Before you accept</strong><p>Inspect the property, confirm the owner and payment details, and use a locally appropriate written lease. This in-app summary does not replace a legal rental agreement.</p></aside>
      {error && <p className="form-error dashboard-error">{error}</p>}
      {loading ? <p>Loading rental offers…</p> : <>{section("Offers sent to me", "Review every detail before you accept or decline.", received)}{section("Offers I sent", "Track the offer shared with your accepted renter.", sent)}</>}
    </div>
  </main>;
}
