"use client";

import { useState } from "react";
import { ethiopianCities } from "@/lib/ethiopian-locations";

export default function HomeSearch() {
  const [city, setCity] = useState("addis-ababa");
  const [kind, setKind] = useState("private_room");
  const [budget, setBudget] = useState("3000-10000");

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (kind === "roommate") { window.location.assign("/roommates"); return; }
    const query = new URLSearchParams({ city, roomType: kind });
    const [minimum, maximum] = budget.split("-");
    if (minimum && minimum !== "0") query.set("minRent", minimum);
    if (maximum) query.set("maxRent", maximum);
    window.location.assign(`/listings?${query}`);
  }

  return <form className="search-panel" onSubmit={search}>
    <label><span>Where</span><select value={city} onChange={(event) => setCity(event.target.value)}>{ethiopianCities.map((item) => <option value={item.slug} key={item.slug}>{item.name}</option>)}</select></label>
    <label><span>I&apos;m looking for</span><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="private_room">A private room</option><option value="shared_room">A shared room</option><option value="apartment">An apartment</option><option value="house">A house</option><option value="roommate">A roommate</option></select></label>
    <label><span>Monthly budget</span><select value={budget} onChange={(event) => setBudget(event.target.value)}><option value="3000-10000">3,000–10,000 ETB</option><option value="0-5000">Under 5,000 ETB</option><option value="5000-8000">5,000–8,000 ETB</option><option value="8000-12000">8,000–12,000 ETB</option><option value="12000-">12,000+ ETB</option></select></label>
    <button className="search-button">Search places <span>→</span></button>
  </form>;
}
