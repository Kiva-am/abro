"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { id: number; title: string; monthlyRent: number; roomType: string; city: string; neighborhood: string | null; description: string; photoKey: string | null };

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) throw new Error(`Request failed with status ${response.status}.`);
  if (!text.trim()) throw new Error("The server returned an empty response.");
  try { return JSON.parse(text) as T; }
  catch { throw new Error("The server returned an invalid response."); }
}

export default function FavoritesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadFavorites() {
      setLoading(true); setError("");
      try {
        const response = await fetch("/api/favorites");
        const data = await readJson<{ listings?: Item[] }>(response);
        if (active) setItems(data.listings ?? []);
      } catch {
        if (active) setError("Saved listings could not be loaded. Please refresh and try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadFavorites();
    return () => { active = false; };
  }, []);

  return <main className="market-page">
    <header className="site-header shell market-header"><Link className="brand" href="/" aria-label="Debal home"><span className="brand-logo" aria-hidden="true" /></Link><nav><Link href="/listings">Browse homes</Link></nav><Link className="button button-dark" href="/listings/new">List a place</Link></header>
    <section className="market-hero shell"><div><span className="eyebrow">YOUR SHORTLIST</span><h1>Saved listings</h1><p>Keep promising places together while you compare location, rent, and living details.</p></div></section>
    <section className="market-results shell">
      {loading ? <p>Loading saved homes…</p> : error ? <div className="empty-state"><strong>We couldn&apos;t load your saved homes.</strong><p>{error}</p><button className="button button-dark" type="button" onClick={() => window.location.reload()}>Try again</button></div> : items.length === 0 ? <div className="empty-state"><strong>No saved homes yet.</strong><p>Tap the heart on a listing to keep it here.</p><Link className="button button-dark" href="/listings">Browse homes</Link></div> : <div className="market-grid">{items.map((item, index) => <Link className="market-card" href={`/listings/${item.id}`} key={item.id}><div className={`market-photo listing-photo-${index % 3 === 0 ? "one" : index % 3 === 1 ? "two" : "three"}`}><span>♥ Saved</span><b>0{index + 1}</b></div><div className="market-card-body"><span className="area">{item.neighborhood ? `${item.neighborhood}, ` : ""}{item.city}</span><h3>{item.title}</h3><p>{item.description}</p><div className="market-price"><strong>{Number(item.monthlyRent).toLocaleString()} ETB<small>/month</small></strong><span>View details →</span></div></div></Link>)}</div>}
    </section>
  </main>;
}
