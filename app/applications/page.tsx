"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import NotificationLink from "@/app/components/notification-link";

type Application = { id: number; listingId: number; renterId: string; ownerId: string; message: string; moveInDate: string; occupants: number; status: "pending" | "shortlisted" | "accepted" | "declined" | "withdrawn"; createdAt: string; listingTitle: string; listingStatus: string; monthlyRent: number; city: string; neighborhood: string | null; photoKey: string | null; renterName: string | null; renterOccupation: string | null; renterBio: string | null; renterVerifiedAt: string | null; ownerName: string | null; direction: "incoming" | "outgoing" };

export default function ApplicationsPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/applications").then(async (response) => { const text = await response.text(); const data = text ? JSON.parse(text) as { applications?: Application[]; error?: string } : {}; if (!response.ok) throw new Error(data.error || "Unable to load applications."); if (active) setItems(data.applications ?? []); }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load applications."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function update(id: number, status: Application["status"]) {
    setUpdating(id); setError("");
    try {
      const response = await fetch("/api/applications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status }) });
      const text = await response.text(); const data = text ? JSON.parse(text) as { error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Unable to update this application.");
      setItems((current) => current.map((item) => item.id === id ? { ...item, status } : status === "accepted" && item.listingId === current.find((entry) => entry.id === id)?.listingId && (item.status === "pending" || item.status === "shortlisted") ? { ...item, status: "declined" } : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update this application."); }
    finally { setUpdating(null); }
  }

  const incoming = useMemo(() => items.filter((item) => item.direction === "incoming"), [items]);
  const outgoing = useMemo(() => items.filter((item) => item.direction === "outgoing"), [items]);
  const section = (title: string, subtitle: string, list: Application[]) => <section className="application-group"><div className="viewing-group-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><span>{list.length}</span></div>{list.length === 0 ? <div className="viewing-empty">Nothing here yet.</div> : <div className="application-list">{list.map((item) => <article className="application-card" key={item.id}><div className="application-property">{item.photoKey ? <img src={`/api/media/${item.photoKey}`} alt={item.listingTitle} /> : <b>DEBAL</b>}<span>{Number(item.monthlyRent).toLocaleString()} ETB/month</span></div><div className="application-copy"><div><span className={`status-pill ${item.status}`}>{item.status}</span><span>{item.neighborhood ? `${item.neighborhood}, ` : ""}{item.city}</span>{item.direction === "incoming" && item.renterVerifiedAt && <span className="identity-mini">✓ Identity verified</span>}</div><h3>{item.listingTitle}</h3><strong>{item.direction === "incoming" ? item.renterName || "Debal member" : `Owner: ${item.ownerName || "Debal member"}`}</strong>{item.direction === "incoming" && item.renterOccupation && <small>{item.renterOccupation}</small>}<blockquote>{item.message}</blockquote><p>Move-in: <b>{new Date(`${item.moveInDate}T00:00:00`).toLocaleDateString([], { dateStyle: "medium" })}</b> · {item.occupants} occupant{item.occupants === 1 ? "" : "s"}</p></div><div className="application-actions"><Link href={`/listings/${item.listingId}`}>View property</Link><Link href={`/messages/${item.direction === "incoming" ? item.renterId : item.ownerId}`}>Message</Link>{item.direction === "incoming" && (item.status === "pending" || item.status === "shortlisted") && <><button disabled={updating === item.id} onClick={() => void update(item.id, "shortlisted")}>Shortlist</button><button className="accept" disabled={updating === item.id} onClick={() => void update(item.id, "accepted")}>Accept</button><button disabled={updating === item.id} onClick={() => void update(item.id, "declined")}>Decline</button></>}{item.direction === "outgoing" && (item.status === "pending" || item.status === "shortlisted") && <button disabled={updating === item.id} onClick={() => void update(item.id, "withdrawn")}>Withdraw</button>}</div></article>)}</div>}</section>;

  return <main className="applications-page"><header className="site-header shell market-header"><Link className="brand" href="/"><span className="brand-logo" /></Link><nav><Link href="/listings">Browse homes</Link><Link href="/viewings">Viewings</Link><Link href="/dashboard">My properties</Link><Link href="/messages">Messages</Link></nav><div className="header-actions"><NotificationLink /><Link className="button button-dark" href="/listings">Find a home</Link></div></header><div className="applications-shell shell"><div className="viewings-heading"><span className="eyebrow">RENTAL APPLICATIONS</span><h1>From interest to the right renter.</h1><p>Renters can present themselves clearly. Owners can shortlist and choose applicants while keeping every decision organized.</p></div>{error && <p className="form-error dashboard-error">{error}</p>}{loading ? <p>Loading rental applications…</p> : <>{section("Applicants for my properties", "Review each renter before making a decision.", incoming)}{section("Properties I applied for", "Track your applications and continue with accepted owners.", outgoing)}</>}</div></main>;
}
