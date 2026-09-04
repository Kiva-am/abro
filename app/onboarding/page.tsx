"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ethiopianCities } from "@/lib/ethiopian-locations";

type Intent = "find_home" | "find_roommate" | "list_property";
type FormState = {
  intents: Intent[];
  firstName: string; occupation: string; bio: string; citySlug: string; neighborhoodSlug: string;
  minBudget: number; maxBudget: number; roomType: string; moveInDate: string; lifestyle: string[];
};

const intentOptions: Array<{ value: Intent; title: string; description: string; symbol: string }> = [
  { value: "find_home", title: "Find a home", description: "Browse rooms, apartments, and houses to rent.", symbol: "⌂" },
  { value: "find_roommate", title: "Find a roommate", description: "Meet compatible people for a shared home.", symbol: "◎" },
  { value: "list_property", title: "List a property", description: "Publish and manage a place you own or represent.", symbol: "+" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<FormState>({
    intents: [], firstName: "", occupation: "", bio: "", citySlug: "addis-ababa", neighborhoodSlug: "addis-ababa-arada",
    minBudget: 3000, maxBudget: 10000, roomType: "private_room", moveInDate: "", lifestyle: [],
  });
  const city = ethiopianCities.find((item) => item.slug === form.citySlug) ?? ethiopianCities[0];
  const neighborhoods = useMemo(() => city.neighborhoods, [city]);
  const wantsHousingPreferences = form.intents.includes("find_home") || form.intents.includes("find_roommate");
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleLifestyle = (value: string) => update("lifestyle", form.lifestyle.includes(value) ? form.lifestyle.filter((item) => item !== value) : [...form.lifestyle, value]);
  const toggleIntent = (value: Intent) => {
    update("intents", form.intents.includes(value) ? form.intents.filter((item) => item !== value) : [...form.intents, value]);
    setMessage("");
  };

  async function saveProfile() {
    setStatus("saving"); setMessage("");
    try {
      const response = await fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const text = await response.text();
      const result = text ? JSON.parse(text) as { saved?: boolean; error?: string } : {};
      if (!response.ok) { setStatus("error"); setMessage(result.error ?? "Unable to save your profile."); return; }
      setStatus("saved");
    } catch {
      setStatus("error"); setMessage("Unable to save your profile right now.");
    }
  }

  if (status === "saved") return (
    <main className="onboarding-page"><header className="onboarding-header shell"><Link className="brand" href="/" aria-label="Debal home"><span className="brand-logo" aria-hidden="true" /></Link></header><section className="saved-card"><span className="saved-check">✓</span><span className="eyebrow">PROFILE SAVED</span><h1>You&apos;re ready to get started.</h1><p>Your Debal profile now reflects what you want to do. You can use more than one part of the marketplace at any time.</p><div className="saved-actions">{form.intents.includes("find_home") && <Link className="button button-dark" href="/listings">Browse homes <span>→</span></Link>}{form.intents.includes("find_roommate") && <Link className="button button-dark" href="/roommates">Find roommates <span>→</span></Link>}{form.intents.includes("list_property") && <Link className="button button-dark" href="/listings/new">List your property <span>→</span></Link>}</div></section></main>
  );

  return (
    <main className="onboarding-page">
      <header className="onboarding-header shell"><Link className="brand" href="/" aria-label="Debal home"><span className="brand-logo" aria-hidden="true" /></Link><span>Your contact details stay private.</span></header>
      <div className="onboarding-layout shell">
        <aside className="onboarding-aside"><span className="eyebrow">SET UP YOUR PROFILE</span><h1>Start with what you need.</h1><p>Choose one or more goals. Debal will shape your next steps around them, and you can change direction later.</p><ol><li className={step === 1 ? "active" : "done"}><span>{step === 1 ? "1" : "✓"}</span><div><strong>Your goals</strong><small>How you want to use Debal</small></div></li><li className={step === 2 ? "active" : step > 2 ? "done" : ""}><span>{step > 2 ? "✓" : "2"}</span><div><strong>About you</strong><small>Basic profile and location</small></div></li><li className={step === 3 ? "active" : ""}><span>3</span><div><strong>Search preferences</strong><small>For homes and roommates</small></div></li></ol></aside>
        <section className="onboarding-card">
          {step === 1 ? (
            <form onSubmit={(event) => { event.preventDefault(); if (!form.intents.length) { setMessage("Choose at least one option to continue."); return; } setMessage(""); setStep(2); }}>
              <div className="form-heading"><span>01</span><div><h2>What brings you to Debal?</h2><p>Select every option that applies. You are not locked into a single account type.</p></div></div>
              <div className="intent-grid">{intentOptions.map((option) => <label className="intent-card" htmlFor={`intent-${option.value}`} key={option.value}><span className="sr-only">Debal account purpose</span><input id={`intent-${option.value}`} type="checkbox" aria-label={option.title} checked={form.intents.includes(option.value)} onChange={() => toggleIntent(option.value)} /><span className="intent-card-body"><b aria-hidden="true">{option.symbol}</b><strong>{option.title}</strong><small>{option.description}</small></span></label>)}</div>
              {message && <p className="form-error" role="alert">{message}</p>}
              <div className="form-actions"><Link href="/">Not now</Link><button className="button button-dark" type="submit">About you <span>→</span></button></div>
            </form>
          ) : step === 2 ? (
            <form onSubmit={(event) => { event.preventDefault(); if (wantsHousingPreferences) { setStep(3); } else { void saveProfile(); } }}>
              <div className="form-heading"><span>02</span><div><h2>Tell us about yourself</h2><p>Only share what helps others understand who they may rent from or live with.</p></div></div>
              <div className="form-grid two"><label><span>First name</span><input required placeholder="Hana" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} /></label><label><span>Occupation</span><input placeholder="Student, designer, engineer..." value={form.occupation} onChange={(e) => update("occupation", e.target.value)} /></label></div>
              <div className="form-grid two"><label><span>City</span><select value={form.citySlug} onChange={(e) => { const nextCity = ethiopianCities.find((item) => item.slug === e.target.value) ?? ethiopianCities[0]; setForm((current) => ({ ...current, citySlug: nextCity.slug, neighborhoodSlug: `${nextCity.slug}-${nextCity.neighborhoods[0].toLowerCase().replaceAll(" ", "-")}` })); }}>{ethiopianCities.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label><label><span>Neighborhood</span><select value={form.neighborhoodSlug} onChange={(e) => update("neighborhoodSlug", e.target.value)}>{neighborhoods.map((name) => <option key={name} value={`${city.slug}-${name.toLowerCase().replaceAll(" ", "-")}`}>{name}</option>)}</select></label></div>
              <label className="full-field"><span>Short introduction</span><textarea rows={4} placeholder="A little about your work, studies, property, or what makes a comfortable home for you." value={form.bio} onChange={(e) => update("bio", e.target.value)} /></label>
              {status === "error" && <p className="form-error" role="alert">{message}</p>}
              <div className="form-actions"><button className="back-link" type="button" onClick={() => { setStatus("idle"); setMessage(""); setStep(1); }}>← Back</button><button className="button button-dark" type="submit" disabled={status === "saving"}>{status === "saving" ? "Saving..." : wantsHousingPreferences ? "Search preferences" : "Finish and save"} <span>→</span></button></div>
            </form>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); void saveProfile(); }}>
              <div className="form-heading"><span>03</span><div><h2>What are you looking for?</h2><p>These answers become your starting search and roommate-match criteria.</p></div></div>
              <div className="form-grid two"><label><span>Minimum budget (ETB)</span><input type="number" min="0" value={form.minBudget} onChange={(e) => update("minBudget", Number(e.target.value))} /></label><label><span>Maximum budget (ETB)</span><input type="number" min="0" value={form.maxBudget} onChange={(e) => update("maxBudget", Number(e.target.value))} /></label></div>
              <div className="form-grid two"><label><span>Room type</span><select value={form.roomType} onChange={(e) => update("roomType", e.target.value)}><option value="private_room">Private room</option><option value="shared_room">Shared room</option><option value="apartment">Apartment</option><option value="house">House</option></select></label><label><span>Move-in date</span><input type="date" value={form.moveInDate} onChange={(e) => update("moveInDate", e.target.value)} /></label></div>
              <fieldset className="choice-group"><legend>Lifestyle</legend><div className="choice-grid">{[["non-smoker","Non-smoker"],["pet-friendly","Pet friendly"],["quiet-home","Quiet home"],["early-sleeper","Early sleeper"],["guests-okay","Guests okay"],["very-tidy","Very tidy"]].map(([value,label]) => <label key={value}><input type="checkbox" checked={form.lifestyle.includes(value)} onChange={() => toggleLifestyle(value)} /><span>{label}</span></label>)}</div></fieldset>
              <div className="privacy-box"><strong>What others will see</strong><p>Your name, introduction, general location, and relevant lifestyle preferences. Phone numbers and identity documents are never displayed publicly.</p></div>
              {status === "error" && <p className="form-error" role="alert">{message}</p>}
              <div className="form-actions"><button className="back-link" type="button" onClick={() => { setStatus("idle"); setMessage(""); setStep(2); }}>← Back</button><button className="button button-dark" type="submit" disabled={status === "saving"}>{status === "saving" ? "Saving..." : "Finish and save"} <span>→</span></button></div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
