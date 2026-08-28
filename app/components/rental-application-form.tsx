"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

function localDate(daysAhead = 1) {
  const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export default function RentalApplicationForm({ listingId, initialStatus }: { listingId: number; initialStatus: string | null }) {
  const minimum = useMemo(() => localDate(), []);
  const [open, setOpen] = useState(false);
  const [moveInDate, setMoveInDate] = useState("");
  const [occupants, setOccupants] = useState("1");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingId, moveInDate, occupants: Number(occupants), message }) });
      const text = await response.text(); const data = text ? JSON.parse(text) as { error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Unable to submit your application.");
      setStatus("pending");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to submit your application."); }
    finally { setSaving(false); }
  }

  if (status) return <div className={`application-confirmation ${status}`}><strong>{status === "accepted" ? "Application accepted" : status === "shortlisted" ? "You are shortlisted" : status === "declined" ? "Application declined" : status === "withdrawn" ? "Application withdrawn" : "Application sent"}</strong><p>Track the owner’s decision and continue the conversation from your applications page.</p><Link href="/applications">View my application →</Link></div>;
  if (!open) return <button className="button application-open" onClick={() => setOpen(true)}>Apply to rent this home <span>→</span></button>;
  return <form className="application-form" onSubmit={submit}><div><strong>Apply to rent this home</strong><button type="button" onClick={() => setOpen(false)} aria-label="Close application form">×</button></div><p>Introduce yourself and share your expected move-in details.</p><label><span>Intended move-in</span><input type="date" required min={minimum} value={moveInDate} onChange={(event) => setMoveInDate(event.target.value)} /></label><label><span>Number of occupants</span><select value={occupants} onChange={(event) => setOccupants(event.target.value)}>{Array.from({ length: 8 }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1}</option>)}</select></label><label><span>Message to the owner</span><textarea rows={4} minLength={20} maxLength={800} required placeholder="Tell the owner who will live here, your occupation, and why this home suits you…" value={message} onChange={(event) => setMessage(event.target.value)} /></label>{error && <small className="form-error">{error}</small>}<button className="button button-dark" disabled={saving}>{saving ? "Submitting…" : "Send application"}</button></form>;
}
