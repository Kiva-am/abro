"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Listing = {
  id: number; title: string; description: string; monthlyRent: number; roomType: string;
  status: "draft" | "active" | "paused" | "rented" | "removed";
  verificationStatus: string; availableFrom: string; city: string; neighborhood: string | null; photoKey: string | null;
};

const roomLabels: Record<string, string> = { private_room: "Private room", shared_room: "Shared room", apartment: "Apartment", house: "House" };

export default function DashboardPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/listings/mine");
      const text = await response.text();
      const data = text ? JSON.parse(text) as { listings?: Listing[]; error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Unable to load your listings.");
      setItems(data.listings ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your listings.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  const totals = useMemo(() => ({
    all: items.filter((item) => item.status !== "removed").length,
    active: items.filter((item) => item.status === "active").length,
    paused: items.filter((item) => item.status === "paused").length,
    rented: items.filter((item) => item.status === "rented").length,
  }), [items]);

  async function changeStatus(id: number, status: Listing["status"]) {
    setUpdating(id); setError("");
    try {
      const response = await fetch("/api/listings/mine", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status }) });
      const text = await response.text();
      const data = text ? JSON.parse(text) as { error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Unable to update the listing.");
      setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update the listing.");
    } finally { setUpdating(null); }
  }

  return <main className="dashboard-page">
    <header className="site-header shell market-header">
      <Link className="brand" href="/" aria-label="Debal home"><span className="brand-logo" aria-hidden="true" /></Link>
      <nav><Link href="/listings">Browse homes</Link><Link href="/roommates">Roommates</Link><Link href="/messages">Messages</Link></nav>
      <Link className="button button-dark" href="/listings/new">Add a property</Link>
    </header>
    <section className="dashboard-shell shell">
      <div className="dashboard-heading">
        <div><span className="eyebrow">OWNER DASHBOARD</span><h1>Your properties, in one place.</h1><p>Keep availability accurate so renters only contact you about homes that are ready.</p></div>
        <Link className="button button-dark" href="/listings/new">Post another place <span>→</span></Link>
      </div>
      <div className="dashboard-stats" aria-label="Listing summary">
        <div><strong>{totals.all}</strong><span>Total properties</span></div><div><strong>{totals.active}</strong><span>Available</span></div><div><strong>{totals.paused}</strong><span>Paused</span></div><div><strong>{totals.rented}</strong><span>Rented</span></div>
      </div>
      {error && <p className="form-error dashboard-error">{error}</p>}
      {loading ? <p>Loading your properties…</p> : items.length === 0 ? <div className="empty-state">
        <strong>You have not posted a property yet.</strong><p>Add a room, apartment, or house and start meeting potential renters.</p><Link className="button button-dark" href="/listings/new">Create your first listing</Link>
      </div> : <div className="owner-listings">
        {items.map((item) => <article className={`owner-listing status-${item.status}`} key={item.id}>
          <div className="owner-listing-main"><div className="owner-listing-photo">{item.photoKey && <img src={`/api/media/${item.photoKey}`} alt={item.title} />}<span>{roomLabels[item.roomType] || item.roomType}</span><b>#{item.id}</b></div><div>
            <div className="owner-listing-labels"><span className={`status-pill ${item.status}`}>{item.status}</span><span>{item.verificationStatus === "verified" ? "✓ Verified" : "Verification pending"}</span></div>
            <h2>{item.title}</h2><p>{item.neighborhood ? `${item.neighborhood}, ` : ""}{item.city} · Available {item.availableFrom}</p><strong>{Number(item.monthlyRent).toLocaleString()} ETB <small>/month</small></strong>
          </div></div>
          <div className="owner-listing-actions">
            {item.status !== "removed" && <Link className="button button-ghost" href={`/listings/${item.id}/edit`}>Edit details & photos</Link>}
            {item.status === "active" && <><Link className="button button-ghost" href={`/listings/${item.id}`}>View listing</Link><button disabled={updating === item.id} onClick={() => void changeStatus(item.id, "paused")}>Pause</button><button disabled={updating === item.id} onClick={() => void changeStatus(item.id, "rented")}>Mark rented</button></>}
            {(item.status === "paused" || item.status === "rented") && <button className="primary-status" disabled={updating === item.id} onClick={() => void changeStatus(item.id, "active")}>Make available</button>}
            {item.status !== "removed" && <button className="remove-status" disabled={updating === item.id} onClick={() => void changeStatus(item.id, "removed")}>Remove</button>}
            {item.status === "removed" && <button disabled={updating === item.id} onClick={() => void changeStatus(item.id, "active")}>Restore listing</button>}
          </div>
        </article>)}
      </div>}
    </section>
  </main>;
}
