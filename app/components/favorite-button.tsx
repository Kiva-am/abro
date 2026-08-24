"use client";

import { useState } from "react";

export default function FavoriteButton({ listingId, initialSaved = false, compact = false }: { listingId: number; initialSaved?: boolean; compact?: boolean }) {
  const [saved, setSaved] = useState(initialSaved); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function toggle() { setBusy(true); setError(""); try { const response = await fetch("/api/favorites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingId }) }); const data = await response.json() as { saved?: boolean; error?: string }; if (!response.ok) throw new Error(data.error); setSaved(Boolean(data.saved)); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save listing."); } finally { setBusy(false); } }
  return <div className={compact ? "favorite-wrap compact" : "favorite-wrap"}><button className={compact ? "favorite-icon" : "button favorite-action"} type="button" disabled={busy} onClick={() => void toggle()} aria-pressed={saved} aria-label={saved ? "Remove from saved listings" : "Save listing"}>{saved ? "♥" : "♡"}{!compact && <span>{saved ? " Saved" : " Save listing"}</span>}</button>{error && !compact && <small role="alert">{error}</small>}</div>;
}
