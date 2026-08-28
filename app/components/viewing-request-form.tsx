"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

function localDateTime(hoursAhead = 1) {
  const value = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}

export default function ViewingRequestForm({ listingId }: { listingId: number }) {
  const minimum = useMemo(() => localDateTime(1), []);
  const [requestedAt, setRequestedAt] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/viewings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingId, requestedAt: new Date(requestedAt).toISOString(), note }) });
      const text = await response.text(); const data = text ? JSON.parse(text) as { error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Unable to request this viewing.");
      setComplete(true);
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Unable to request this viewing."); }
    finally { setSaving(false); }
  }

  if (complete) return <div className="viewing-success"><strong>Viewing requested</strong><p>The owner can now accept or suggest that you continue in messages.</p><Link href="/viewings">Track my request →</Link></div>;
  return <form className="viewing-form" onSubmit={submit}>
    <strong>Request a viewing</strong><p>Choose a date and time that works for you.</p>
    <label><span>Preferred date and time</span><input type="datetime-local" required min={minimum} value={requestedAt} onChange={(event) => setRequestedAt(event.target.value)} /></label>
    <label><span>Note for the owner</span><textarea rows={2} maxLength={500} placeholder="I am available after work…" value={note} onChange={(event) => setNote(event.target.value)} /></label>
    {message && <small className="form-error">{message}</small>}
    <button className="button button-dark" disabled={saving}>{saving ? "Requesting…" : "Request viewing"} <span>→</span></button>
  </form>;
}
