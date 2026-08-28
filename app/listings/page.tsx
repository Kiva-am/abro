"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FavoriteButton from "@/app/components/favorite-button";
import { ethiopianCities } from "@/lib/ethiopian-locations";

type Listing = { id: number; title: string; description: string; monthlyRent: number; deposit: number; roomType: string; bedrooms: number; bathrooms: number; furnished: number; utilitiesIncluded: number; availableFrom: string; verificationStatus: string; city: string; neighborhood: string | null; photoKey: string | null };
const roomLabels: Record<string, string> = { private_room: "Private room", shared_room: "Shared room", apartment: "Apartment", house: "House" };

export default function ListingsPage() {
  const [city, setCity] = useState(""); const [roomType, setRoomType] = useState(""); const [maxRent, setMaxRent] = useState("");
  const [items, setItems] = useState<Listing[]>([]); const [savedIds, setSavedIds] = useState<number[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    const query = new URLSearchParams(); if (city) query.set("city", city); if (roomType) query.set("roomType", roomType); if (maxRent) query.set("maxRent", maxRent);
    try { const response = await fetch(`/api/listings?${query}`); const data = await response.json() as { listings?: Listing[]; error?: string }; if (!response.ok) throw new Error(data.error); setItems(data.listings ?? []); }
    catch { setError("Listings could not be loaded right now."); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); void fetch("/api/favorites").then((response)=>response.json()).then((data:{listingIds?:number[]})=>setSavedIds(data.listingIds??[])); }, []);
  return <main className="market-page">
    <header className="site-header shell market-header"><Link className="brand" href="/" aria-label="Debal home"><span className="brand-logo" aria-hidden="true" /></Link><nav><Link href="/listings">Browse homes</Link><Link href="/favorites">Saved</Link><Link href="/viewings">Viewings</Link><Link href="/dashboard">My properties</Link><Link href="/onboarding">My profile</Link></nav><Link className="button button-dark" href="/listings/new">List a place</Link></header>
    <section className="market-hero shell"><div><span className="eyebrow">ETHIOPIAN HOMES</span><h1>Find a place that fits.</h1><p>Clear rent, location, availability, and house details—before you start a conversation.</p></div><Link className="button button-dark" href="/listings/new">Publish your place <span>→</span></Link></section>
    <section className="filter-bar shell" aria-label="Listing filters"><label>City<select value={city} onChange={(e) => setCity(e.target.value)}><option value="">All cities</option>{ethiopianCities.map((item) => <option value={item.slug} key={item.slug}>{item.name}</option>)}</select></label><label>Type<select value={roomType} onChange={(e) => setRoomType(e.target.value)}><option value="">Any type</option>{Object.entries(roomLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Maximum rent<input type="number" min="0" placeholder="10,000 ETB" value={maxRent} onChange={(e) => setMaxRent(e.target.value)} /></label><button className="button button-dark" onClick={() => void load()}>Apply filters</button></section>
    <section className="market-results shell"><div className="results-heading"><h2>Available places</h2><span>{loading ? "Loading…" : `${items.length} listing${items.length === 1 ? "" : "s"}`}</span></div>{error && <p className="form-error">{error}</p>}{!loading && !error && items.length === 0 && <div className="empty-state"><strong>No listings match yet.</strong><p>Try a wider budget or publish the first place in this area.</p><Link className="button button-dark" href="/listings/new">Create listing</Link></div>}<div className="market-grid">{items.map((item, index) => <article className="market-card" key={item.id}><div className={`market-photo listing-photo-${index % 3 === 0 ? "one" : index % 3 === 1 ? "two" : "three"}`}>{item.photoKey && <img className="listing-image" src={`/api/media/${item.photoKey}`} alt={item.title} />}<span>{item.verificationStatus === "verified" ? "✓ Verified property" : "New listing"}</span><FavoriteButton listingId={item.id} initialSaved={savedIds.includes(item.id)} compact/><b>0{index + 1}</b></div><Link href={`/listings/${item.id}`} className="market-card-body"><span className="area">{item.neighborhood ? `${item.neighborhood}, ` : ""}{item.city}</span><h3>{item.title}</h3><p>{item.description}</p><div className="property-tags"><span>{roomLabels[item.roomType]}</span><span>{item.bedrooms} bed</span><span>{item.furnished ? "Furnished" : "Unfurnished"}</span></div><div className="market-price"><strong>{Number(item.monthlyRent).toLocaleString()} ETB<small>/month</small></strong><span>View details →</span></div></Link></article>)}</div></section>
  </main>;
}
