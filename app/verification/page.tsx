"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Verification = {
  id: number;
  type: "identity" | "property";
  listingId: number | null;
  listingTitle: string | null;
  documentKey: string;
  documentName: string;
  status: "pending" | "approved" | "rejected";
  moderatorNote: string;
  createdAt: string;
};
type Listing = { id: number; title: string; verificationStatus: "unverified" | "pending" | "verified" };
type PageData = { identityVerifiedAt: string | null; requests: Verification[]; listings: Listing[] };

function latest(items: Verification[], type: Verification["type"], listingId?: number) {
  return items.find((item) => item.type === type && (type === "identity" || item.listingId === listingId));
}

export default function VerificationPage() {
  const [data, setData] = useState<PageData>({ identityVerifiedAt: null, requests: [], listings: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"identity" | "property" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchData() {
    const response = await fetch("/api/verifications");
    const text = await response.text();
    const result = text ? JSON.parse(text) as PageData & { error?: string } : null;
    if (!response.ok || !result) throw new Error(result?.error || "Unable to load verification.");
    return result;
  }

  useEffect(() => {
    let active = true;
    void fetchData().then((result) => { if (active) setData(result); }).catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : "Unable to load verification.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const identityRequest = useMemo(() => latest(data.requests, "identity"), [data.requests]);

  async function submit(event: FormEvent<HTMLFormElement>, type: "identity" | "property") {
    event.preventDefault();
    setSubmitting(type);
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    form.set("type", type);
    try {
      const response = await fetch("/api/verifications", { method: "POST", body: form });
      const text = await response.text();
      const result = text ? JSON.parse(text) as { error?: string } : {};
      if (!response.ok) throw new Error(result.error || "Unable to submit this document.");
      event.currentTarget.reset();
      setSuccess(type === "identity" ? "Your identity document is ready for review." : "Your property document is ready for review.");
      setData(await fetchData());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to submit this document.");
    } finally {
      setSubmitting(null);
    }
  }

  return <main className="verification-page">
    <header className="site-header shell market-header">
      <Link className="brand" href="/" aria-label="Debal home"><span className="brand-logo" aria-hidden="true" /></Link>
      <nav><Link href="/listings">Browse homes</Link><Link href="/roommates">Roommates</Link><Link href="/dashboard">My properties</Link><Link href="/messages">Messages</Link></nav>
      <Link className="button button-dark" href="/dashboard">Dashboard</Link>
    </header>
    <section className="verification-shell shell">
      <div className="verification-heading"><div><span className="eyebrow">TRUST YOUR NEXT MOVE</span><h1>Verify your identity and properties.</h1><p>Verification gives renters, owners, and future roommates a clearer trust signal before they connect.</p></div><div className="privacy-seal"><strong>Private by design</strong><span>Your documents are only visible to you and authorized Debal moderators.</span></div></div>
      {error && <p className="form-error verification-alert">{error}</p>}
      {success && <p className="verification-success">{success}</p>}
      {loading ? <p>Loading your verification details…</p> : <div className="verification-grid">
        <article className="verification-card">
          <div className="verification-card-title"><span>01</span><div><h2>Identity verification</h2><p>Upload a clear government-issued ID. Sensitive details will never appear on your public profile.</p></div></div>
          <Status request={identityRequest} verified={Boolean(data.identityVerifiedAt)} />
          {!data.identityVerifiedAt && identityRequest?.status !== "pending" && <form onSubmit={(event) => void submit(event, "identity")}>
            <DocumentPicker label="Government ID" />
            <button className="button button-dark" disabled={submitting !== null}>{submitting === "identity" ? "Submitting…" : identityRequest?.status === "rejected" ? "Submit a new document" : "Submit for review"}</button>
          </form>}
        </article>
        <article className="verification-card">
          <div className="verification-card-title"><span>02</span><div><h2>Property verification</h2><p>Choose your listing and upload proof such as a title document, lease, or utility bill showing your right to offer it.</p></div></div>
          {data.listings.length === 0 ? <div className="verification-empty"><p>You need a property listing before you can verify it.</p><Link className="button button-dark" href="/listings/new">Add a property</Link></div> : <>
            <div className="property-verification-list">{data.listings.map((listing) => {
              const request = latest(data.requests, "property", listing.id);
              return <div key={listing.id}><div><strong>{listing.title}</strong><small>{listing.verificationStatus === "verified" ? "Verified property" : request?.status === "pending" ? "Review in progress" : request?.status === "rejected" ? "Needs a new document" : "Not yet verified"}</small></div><span className={`status-pill ${listing.verificationStatus === "verified" ? "approved" : request?.status || "unverified"}`}>{listing.verificationStatus === "verified" ? "✓ verified" : request?.status || "unverified"}</span></div>;
            })}</div>
            {data.listings.some((listing) => listing.verificationStatus !== "verified" && latest(data.requests, "property", listing.id)?.status !== "pending") && <form onSubmit={(event) => void submit(event, "property")}>
              <label className="verification-field"><span>Property to verify</span><select name="listingId" required defaultValue=""><option value="" disabled>Select your property</option>{data.listings.filter((listing) => listing.verificationStatus !== "verified" && latest(data.requests, "property", listing.id)?.status !== "pending").map((listing) => <option value={listing.id} key={listing.id}>{listing.title}</option>)}</select></label>
              <DocumentPicker label="Ownership or management document" />
              <button className="button button-dark" disabled={submitting !== null}>{submitting === "property" ? "Submitting…" : "Submit property for review"}</button>
            </form>}
          </>}
        </article>
      </div>}
      {!loading && data.requests.length > 0 && <section className="verification-history"><h2>Submission history</h2><div>{data.requests.map((item) => <article key={item.id}><div><span className={`status-pill ${item.status}`}>{item.status}</span><strong>{item.type === "identity" ? "Identity document" : item.listingTitle || "Property document"}</strong></div><p>{item.documentName} · submitted {new Date(item.createdAt).toLocaleDateString()}</p>{item.moderatorNote && <small>Reviewer note: {item.moderatorNote}</small>}<a href={`/api/verification-files/${item.documentKey}`} target="_blank" rel="noreferrer">View your document →</a></article>)}</div></section>}
    </section>
  </main>;
}

function DocumentPicker({ label }: { label: string }) {
  return <label className="document-picker"><input name="document" type="file" accept="image/jpeg,image/png,application/pdf" required /><strong>{label}</strong><span>JPG, PNG, or PDF · maximum 10 MB</span></label>;
}

function Status({ request, verified }: { request?: Verification; verified: boolean }) {
  const status = verified ? "approved" : request?.status || "unverified";
  return <div className={`verification-status ${status}`}><span>{verified ? "✓" : request?.status === "pending" ? "…" : request?.status === "rejected" ? "!" : "○"}</span><div><strong>{verified ? "Identity verified" : request?.status === "pending" ? "Review in progress" : request?.status === "rejected" ? "New document needed" : "Not yet verified"}</strong><p>{verified ? "Your public roommate profile now displays an identity verified badge." : request?.status === "pending" ? "Debal moderators will review your document before showing a badge." : request?.moderatorNote || "Submit one private document to begin."}</p></div></div>;
}
