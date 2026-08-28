"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Verification = { id: number; type: "identity" | "property"; userId: string; listingId: number | null; documentKey: string; documentName: string; status: "pending" | "approved" | "rejected"; moderatorNote: string; createdAt: string; applicantName: string | null; email: string | null; listingTitle: string | null };

export default function VerificationModerationPage() {
  const [items, setItems] = useState<Verification[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/moderation/verifications").then(async (response) => {
      const text = await response.text();
      const data = text ? JSON.parse(text) as { requests?: Verification[]; error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Unable to load verification requests.");
      if (active) setItems(data.requests ?? []);
    }).catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : "Unable to load verification requests.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function review(id: number, status: "approved" | "rejected") {
    setUpdating(id);
    setError("");
    try {
      const response = await fetch("/api/moderation/verifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status, note: notes[id] || "" }) });
      const text = await response.text();
      const data = text ? JSON.parse(text) as { error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Unable to review this request.");
      setItems((current) => current.map((item) => item.id === id ? { ...item, status, moderatorNote: notes[id] || "" } : item));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to review this request.");
    } finally { setUpdating(null); }
  }

  return <main className="moderation-page">
    <header className="site-header shell market-header"><Link className="brand" href="/"><span className="brand-logo" /></Link><nav><Link href="/moderation">Reports</Link><Link href="/dashboard">Dashboard</Link></nav><Link className="button button-dark" href="/verification">My verification</Link></header>
    <section className="moderation-shell shell"><span className="eyebrow">VERIFICATION REVIEW</span><h1>Review trust documents.</h1><p>Open each private document, compare it with the applicant or property, and record a clear decision.</p>{error && <p className="form-error dashboard-error">{error}</p>}{loading ? <p>Loading verification requests…</p> : items.length === 0 ? <div className="empty-state"><strong>No verification requests yet.</strong></div> : <div className="report-list">{items.map((item) => <article className="report-card" key={item.id}><div className="report-copy"><div><span className={`status-pill ${item.status}`}>{item.status}</span><span>{item.type} verification</span></div><h2>{item.listingTitle || item.applicantName || "Debal member"}</h2><p>{item.applicantName || item.email || "Applicant"} submitted <strong>{item.documentName}</strong>.</p><small>Submitted {new Date(item.createdAt).toLocaleString()}</small><a href={`/api/verification-files/${item.documentKey}`} target="_blank" rel="noreferrer">Open private document →</a>{item.listingId && <Link href={`/listings/${item.listingId}`}>Open listing →</Link>}{item.type === "identity" && <Link href={`/roommates/${item.userId}`}>Open member profile →</Link>}</div><div className="report-review"><textarea rows={3} placeholder={item.status === "pending" ? "Required when rejecting; optional when approving" : "Reviewer note"} value={notes[item.id] ?? item.moderatorNote} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} disabled={item.status !== "pending"} />{item.status === "pending" ? <div><button className="resolve" disabled={updating === item.id} onClick={() => void review(item.id, "approved")}>Approve</button><button disabled={updating === item.id} onClick={() => void review(item.id, "rejected")}>Reject</button></div> : <small>This request has been reviewed.</small>}</div></article>)}</div>}</section>
  </main>;
}
