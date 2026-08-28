"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import FavoriteButton from "@/app/components/favorite-button";
import { ethiopianCities } from "@/lib/ethiopian-locations";

type Listing = { id: number; title: string; description: string; monthlyRent: number; deposit: number; roomType: string; bedrooms: number; bathrooms: number; furnished: number; utilitiesIncluded: number; availableFrom: string; verificationStatus: string; city: string; neighborhood: string | null; photoKey: string | null };
type Filters = { q: string; city: string; neighborhood: string; roomType: string; minRent: string; maxRent: string; bedrooms: string; availableBy: string; furnished: boolean; utilities: boolean; verified: boolean; sort: string };
const roomLabels: Record<string, string> = { private_room: "Private room", shared_room: "Shared room", apartment: "Apartment", house: "House" };

export default function ListingsPage() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => ({
    q: searchParams.get("q") ?? "", city: searchParams.get("city") ?? "", neighborhood: searchParams.get("neighborhood") ?? "",
    roomType: searchParams.get("roomType") ?? "", minRent: searchParams.get("minRent") ?? "", maxRent: searchParams.get("maxRent") ?? "",
    bedrooms: searchParams.get("bedrooms") ?? "", availableBy: searchParams.get("availableBy") ?? "", furnished: searchParams.get("furnished") === "1",
    utilities: searchParams.get("utilities") === "1", verified: searchParams.get("verified") === "1", sort: searchParams.get("sort") ?? "newest",
  }));
  const [items, setItems] = useState<Listing[]>([]);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const city = ethiopianCities.find((item) => item.slug === filters.city);
  const neighborhoods = useMemo(() => city?.neighborhoods ?? [], [city]);
  const update = (key: keyof Filters, value: Filters[keyof Filters]) => setFilters((current) => ({ ...current, [key]: value }));

  function toQuery(values: Filters) {
    const query = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => { if (typeof value === "boolean") { if (value) query.set(key, "1"); } else if (value) query.set(key, value); });
    return query;
  }

  async function load(values = filters, updateUrl = true) {
    setLoading(true); setError(""); const query = toQuery(values);
    if (updateUrl) window.history.replaceState(null, "", `${window.location.pathname}${query.size ? `?${query}` : ""}`);
    try {
      const response = await fetch(`/api/listings?${query}`); const text = await response.text();
      const data = text ? JSON.parse(text) as { listings?: Listing[]; error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Listings could not be loaded.");
      setItems(data.listings ?? []);
    } catch { setError("Listings could not be loaded right now."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void load(filters, false);
    void fetch("/api/favorites").then((response) => response.text()).then((text) => text ? JSON.parse(text) as { listingIds?: number[] } : {}).then((data) => setSavedIds(data.listingIds ?? [])).catch(() => setSavedIds([]));
  }, []);

  function clear() {
    const empty: Filters = { q: "", city: "", neighborhood: "", roomType: "", minRent: "", maxRent: "", bedrooms: "", availableBy: "", furnished: false, utilities: false, verified: false, sort: "newest" };
    setFilters(empty); void load(empty);
  }

  return <main className="market-page">
    <header className="site-header shell market-header"><Link className="brand" href="/" aria-label="Debal home"><span className="brand-logo" aria-hidden="true" /></Link><nav><Link href="/listings">Browse homes</Link><Link href="/favorites">Saved</Link><Link href="/viewings">Viewings</Link><Link href="/applications">Applications</Link><Link href="/dashboard">My properties</Link><Link href="/onboarding">My profile</Link></nav><Link className="button button-dark" href="/listings/new">List a place</Link></header>
    <section className="market-hero shell"><div><span className="eyebrow">ETHIOPIAN HOMES</span><h1>Find a place that fits.</h1><p>Search by the details that matter—location, cost, space, furnishing, and move-in timing.</p></div><Link className="button button-dark" href="/listings/new">Publish your place <span>→</span></Link></section>
    <form className="advanced-filter shell" onSubmit={(event) => { event.preventDefault(); void load(); }}>
      <div className="filter-main"><label className="keyword-field"><span>Search</span><input placeholder="Bole, quiet room, near transport…" value={filters.q} onChange={(event) => update("q", event.target.value)} /></label><label><span>City</span><select value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value, neighborhood: "" }))}><option value="">All cities</option>{ethiopianCities.map((item) => <option value={item.slug} key={item.slug}>{item.name}</option>)}</select></label><label><span>Neighborhood</span><select value={filters.neighborhood} disabled={!city} onChange={(event) => update("neighborhood", event.target.value)}><option value="">All neighborhoods</option>{neighborhoods.map((name) => <option key={name} value={`${city?.slug}-${name.toLowerCase().replaceAll(" ", "-")}`}>{name}</option>)}</select></label><label><span>Property type</span><select value={filters.roomType} onChange={(event) => update("roomType", event.target.value)}><option value="">Any type</option>{Object.entries(roomLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
      <div className="filter-secondary"><label><span>Minimum rent</span><input type="number" min="0" placeholder="3,000" value={filters.minRent} onChange={(event) => update("minRent", event.target.value)} /></label><label><span>Maximum rent</span><input type="number" min="0" placeholder="12,000" value={filters.maxRent} onChange={(event) => update("maxRent", event.target.value)} /></label><label><span>Bedrooms</span><select value={filters.bedrooms} onChange={(event) => update("bedrooms", event.target.value)}><option value="">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></label><label><span>Available by</span><input type="date" value={filters.availableBy} onChange={(event) => update("availableBy", event.target.value)} /></label><label><span>Sort by</span><select value={filters.sort} onChange={(event) => update("sort", event.target.value)}><option value="newest">Newest first</option><option value="price_low">Lowest rent</option><option value="price_high">Highest rent</option><option value="available">Available soonest</option></select></label></div>
      <div className="filter-toggles"><label><input type="checkbox" checked={filters.furnished} onChange={(event) => update("furnished", event.target.checked)} /> Furnished</label><label><input type="checkbox" checked={filters.utilities} onChange={(event) => update("utilities", event.target.checked)} /> Utilities included</label><label><input type="checkbox" checked={filters.verified} onChange={(event) => update("verified", event.target.checked)} /> Verified only</label><div><button type="button" className="clear-filters" onClick={clear}>Clear</button><button className="button button-dark">Search homes</button></div></div>
    </form>
    <section className="market-results shell"><div className="results-heading"><h2>Available places</h2><span>{loading ? "Searching…" : `${items.length} listing${items.length === 1 ? "" : "s"}`}</span></div>{error && <p className="form-error">{error}</p>}{!loading && !error && items.length === 0 && <div className="empty-state"><strong>No listings match these filters.</strong><p>Clear one or two choices to see more homes.</p><button className="button button-dark" onClick={clear}>Clear all filters</button></div>}<div className="market-grid">{items.map((item, index) => <article className="market-card" key={item.id}><div className={`market-photo listing-photo-${index % 3 === 0 ? "one" : index % 3 === 1 ? "two" : "three"}`}>{item.photoKey && <img className="listing-image" src={`/api/media/${item.photoKey}`} alt={item.title} />}<span>{item.verificationStatus === "verified" ? "✓ Verified property" : "New listing"}</span><FavoriteButton listingId={item.id} initialSaved={savedIds.includes(item.id)} compact /><b>0{index + 1}</b></div><Link href={`/listings/${item.id}`} className="market-card-body"><span className="area">{item.neighborhood ? `${item.neighborhood}, ` : ""}{item.city}</span><h3>{item.title}</h3><p>{item.description}</p><div className="property-tags"><span>{roomLabels[item.roomType]}</span><span>{item.bedrooms} bed</span><span>{item.furnished ? "Furnished" : "Unfurnished"}</span><span>From {item.availableFrom}</span></div><div className="market-price"><strong>{Number(item.monthlyRent).toLocaleString()} ETB<small>/month</small></strong><span>View details →</span></div></Link></article>)}</div></section>
  </main>;
}
