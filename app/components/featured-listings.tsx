"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type FeaturedListing = {
  id: number;
  title: string;
  monthlyRent: number;
  roomType: string;
  bedrooms: number;
  furnished: number;
  availableFrom: string;
  verificationStatus: string;
  city: string;
  neighborhood: string | null;
  photoKey: string | null;
};

const roomLabels: Record<string, string> = {
  private_room: "Private room",
  shared_room: "Shared room",
  apartment: "Apartment",
  house: "House",
};

export default function FeaturedListings() {
  const [listings, setListings] = useState<FeaturedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/listings?sort=featured").then(async (response) => {
      const text = await response.text();
      const data = text ? JSON.parse(text) as { listings?: FeaturedListing[] } : {};
      if (!response.ok) throw new Error("Unable to load listings.");
      if (active) setListings((data.listings ?? []).slice(0, 3));
    }).catch(() => {
      if (active) setFailed(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="home-listings-loading" role="status">Loading available homes…</div>;
  if (!listings.length) return <div className="empty-state home-listings-empty">
    <strong>{failed ? "Homes are temporarily unavailable." : "The first homes are coming soon."}</strong>
    <p>{failed ? "Please try browsing again in a moment." : "No active listings are published right now. Owners can add a verified place while renters prepare their profile."}</p>
    <Link className="button button-dark" href={failed ? "/listings" : "/listings/new"}>{failed ? "Browse homes" : "List a place"}</Link>
  </div>;

  return <div className="listing-grid">
    {listings.map((listing, index) => <Link className="listing-card" href={`/listings/${listing.id}`} key={listing.id}>
      <div className={`listing-photo listing-photo-${index % 3 === 0 ? "one" : index % 3 === 1 ? "two" : "three"} ${listing.photoKey ? "has-image" : ""}`}>
        {listing.photoKey && <Image className="listing-image" src={`/api/media/${listing.photoKey}`} alt={listing.title} fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw" />}
        <span className="verified-pill">{listing.verificationStatus === "verified" ? "✓ Verified property" : "Recently listed"}</span>
        <span className="photo-number">0{index + 1}</span>
      </div>
      <div className="listing-body">
        <span className="area">{listing.neighborhood ? `${listing.neighborhood}, ` : ""}{listing.city}</span>
        <h3>{listing.title}</h3>
        <p>{roomLabels[listing.roomType] || "Home"} · {listing.bedrooms} bedroom{listing.bedrooms === 1 ? "" : "s"} · {listing.furnished ? "Furnished" : "Unfurnished"} · Available {listing.availableFrom}</p>
        <div className="listing-meta"><strong>{Number(listing.monthlyRent).toLocaleString()} ETB<small>/month</small></strong><span>View home →</span></div>
      </div>
    </Link>)}
  </div>;
}
