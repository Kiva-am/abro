"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Viewing = {
  id: number; listingId: number; requestedAt: string; note: string; status: "pending" | "accepted" | "declined" | "cancelled";
  listingTitle: string; listingStatus: string; city: string; neighborhood: string | null; photoKey: string | null;
  direction: "incoming" | "outgoing"; otherUserId: string; otherName: string | null;
};

export default function ViewingsPage() {
  const [items, setItems] = useState<Viewing[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/viewings"); const text = await response.text();
      const data = text ? JSON.parse(text) as { viewings?: Viewing[]; error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Unable to load viewing requests.");
      setItems(data.viewings ?? []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load viewing requests."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function updateStatus(id: number, status: Viewing["status"]) {
    setUpdating(id); setError("");
    try {
      const response = await fetch(`/api/viewings/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
      const text = await response.text(); const data = text ? JSON.parse(text) as { error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Unable to update the request.");
      setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update the request."); }
    finally { setUpdating(null); }
  }

  const incoming = useMemo(() => items.filter((item) => item.direction === "incoming"), [items]);
  const outgoing = useMemo(() => items.filter((item) => item.direction === "outgoing"), [items]);
  const section = (title: string, subtitle: string, list: Viewing[]) => <section className="viewing-group"><div className="viewing-group-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><span>{list.length}</span></div>{list.length === 0 ? <div className="viewing-empty">Nothing here yet.</div> : <div className="viewing-list">{list.map((item) => <article className="viewing-card" key={item.id}>
    <div className="viewing-photo">{item.photoKey ? <img src={`/api/media/${item.photoKey}`} alt={item.listingTitle} /> : <b>DEBAL</b>}</div>
    <div className="viewing-copy"><div><span className={`status-pill ${item.status}`}>{item.status}</span><span>{item.neighborhood ? `${item.neighborhood}, ` : ""}{item.city}</span></div><h3>{item.listingTitle}</h3><strong>{new Date(item.requestedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</strong><p>{item.note || "No additional note."}</p><small>{item.direction === "incoming" ? `Requested by ${item.otherName || "Debal member"}` : `Owner: ${item.otherName || "Debal member"}`}</small></div>
    <div className="viewing-actions">{item.listingStatus === "active" && <Link href={`/listings/${item.listingId}`}>View property</Link>}<Link href={`/messages/${item.otherUserId}`}>Message</Link>{item.direction === "incoming" && item.status === "pending" && <><button className="accept" disabled={updating === item.id} onClick={() => void updateStatus(item.id, "accepted")}>Accept</button><button disabled={updating === item.id} onClick={() => void updateStatus(item.id, "declined")}>Decline</button></>}{item.direction === "outgoing" && (item.status === "pending" || item.status === "accepted") && <button disabled={updating === item.id} onClick={() => void updateStatus(item.id, "cancelled")}>Cancel</button>}</div>
  </article>)}</div>}</section>;

  return <main className="viewings-page"><header className="site-header shell market-header"><Link className="brand" href="/"><span className="brand-logo" /></Link><nav><Link href="/listings">Browse homes</Link><Link href="/dashboard">My properties</Link><Link href="/messages">Messages</Link></nav><Link className="button button-dark" href="/listings">Find a home</Link></header><div className="viewings-shell shell"><div className="viewings-heading"><span className="eyebrow">PROPERTY VIEWINGS</span><h1>Plan the visit before the move.</h1><p>Owners and renters can confirm a time, keep the conversation in Debal, and avoid sending money before seeing the property.</p></div>{error && <p className="form-error dashboard-error">{error}</p>}{loading ? <p>Loading viewing requests…</p> : <>{section("Requests for my properties", "Review requests from potential renters.", incoming)}{section("My viewing requests", "Track appointments you requested as a renter.", outgoing)}</>}</div></main>;
}
