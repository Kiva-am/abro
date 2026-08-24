"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ethiopianCities } from "@/lib/ethiopian-locations";

type FormState = {
  firstName: string; occupation: string; bio: string; citySlug: string; neighborhoodSlug: string;
  minBudget: number; maxBudget: number; roomType: string; moveInDate: string; lifestyle: string[];
};

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<FormState>({
    firstName: "", occupation: "", bio: "", citySlug: "addis-ababa", neighborhoodSlug: "addis-ababa-arada",
    minBudget: 3000, maxBudget: 10000, roomType: "private_room", moveInDate: "", lifestyle: [],
  });
  const city = ethiopianCities.find((item) => item.slug === form.citySlug) ?? ethiopianCities[0];
  const neighborhoods = useMemo(() => city.neighborhoods, [city]);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleLifestyle = (value: string) => update("lifestyle", form.lifestyle.includes(value) ? form.lifestyle.filter((item) => item !== value) : [...form.lifestyle, value]);

  async function saveProfile() {
    setStatus("saving"); setMessage("");
    const response = await fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const result = (await response.json()) as { saved?: boolean; error?: string };
    if (!response.ok) { setStatus("error"); setMessage(result.error ?? "Unable to save your profile."); return; }
    setStatus("saved");
  }

  if (status === "saved") return (
    <main className="onboarding-page"><header className="onboarding-header shell"><Link className="brand" href="/" aria-label="Debal home"><span className="brand-logo" aria-hidden="true" /></Link></header><section className="saved-card"><span className="saved-check">✓</span><span className="eyebrow">PROFILE SAVED</span><h1>You&apos;re ready to start exploring.</h1><p>Your profile and housing preferences are now safely stored. Next, we&apos;ll use them to personalize listings and roommate matches.</p><Link className="button button-dark" href="/">Go to Debal <span>→</span></Link></section></main>
  );

  return (
    <main className="onboarding-page">
      <header className="onboarding-header shell"><Link className="brand" href="/" aria-label="Debal home"><span className="brand-logo" aria-hidden="true" /></Link><span>Your profile is private until you publish it.</span></header>
      <div className="onboarding-layout shell">
        <aside className="onboarding-aside"><span className="eyebrow">SET UP YOUR PROFILE</span><h1>Help Debal find the right fit.</h1><p>Your answers improve housing results and roommate compatibility. You can change them later.</p><ol><li className={step === 1 ? "active" : "done"}><span>{step === 1 ? "1" : "✓"}</span><div><strong>About you</strong><small>Basic profile and location</small></div></li><li className={step === 2 ? "active" : ""}><span>2</span><div><strong>Your preferences</strong><small>Budget, room and lifestyle</small></div></li></ol></aside>
        <section className="onboarding-card">
          {step === 1 ? (
            <form onSubmit={(event) => { event.preventDefault(); setStep(2); }}>
              <div className="form-heading"><span>01</span><div><h2>Tell us about yourself</h2><p>Only share what helps others understand who they may live with.</p></div></div>
              <div className="form-grid two"><label><span>First name</span><input required placeholder="Hana" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} /></label><label><span>Occupation</span><input placeholder="Student, designer, engineer..." value={form.occupation} onChange={(e) => update("occupation", e.target.value)} /></label></div>
              <div className="form-grid two"><label><span>City</span><select value={form.citySlug} onChange={(e) => { const nextCity = ethiopianCities.find((item) => item.slug === e.target.value) ?? ethiopianCities[0]; setForm((current) => ({ ...current, citySlug: nextCity.slug, neighborhoodSlug: `${nextCity.slug}-${nextCity.neighborhoods[0].toLowerCase().replaceAll(" ", "-")}` })); }}>{ethiopianCities.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label><label><span>Neighborhood</span><select value={form.neighborhoodSlug} onChange={(e) => update("neighborhoodSlug", e.target.value)}>{neighborhoods.map((name) => <option key={name} value={`${city.slug}-${name.toLowerCase().replaceAll(" ", "-")}`}>{name}</option>)}</select></label></div>
              <label className="full-field"><span>Short introduction</span><textarea rows={4} placeholder="A little about your work, studies, and what makes a comfortable home for you." value={form.bio} onChange={(e) => update("bio", e.target.value)} /></label>
              <div className="form-actions"><Link href="/">Save and leave</Link><button className="button button-dark" type="submit">Housing preferences <span>→</span></button></div>
            </form>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); void saveProfile(); }}>
              <div className="form-heading"><span>02</span><div><h2>What are you looking for?</h2><p>These answers become your starting search and match criteria.</p></div></div>
              <div className="form-grid two"><label><span>Minimum budget (ETB)</span><input type="number" min="0" value={form.minBudget} onChange={(e) => update("minBudget", Number(e.target.value))} /></label><label><span>Maximum budget (ETB)</span><input type="number" min="0" value={form.maxBudget} onChange={(e) => update("maxBudget", Number(e.target.value))} /></label></div>
              <div className="form-grid two"><label><span>Room type</span><select value={form.roomType} onChange={(e) => update("roomType", e.target.value)}><option value="private_room">Private room</option><option value="shared_room">Shared room</option><option value="apartment">Apartment</option><option value="house">House</option></select></label><label><span>Move-in date</span><input type="date" value={form.moveInDate} onChange={(e) => update("moveInDate", e.target.value)} /></label></div>
              <fieldset className="choice-group"><legend>Lifestyle</legend><div className="choice-grid">{[["non-smoker","Non-smoker"],["pet-friendly","Pet friendly"],["quiet-home","Quiet home"],["early-sleeper","Early sleeper"],["guests-okay","Guests okay"],["very-tidy","Very tidy"]].map(([value,label]) => <label key={value}><input type="checkbox" checked={form.lifestyle.includes(value)} onChange={() => toggleLifestyle(value)} /><span>{label}</span></label>)}</div></fieldset>
              <div className="privacy-box"><strong>What others will see</strong><p>Your name, introduction, general location and lifestyle preferences. Phone numbers and identity documents are never displayed publicly.</p></div>
              {status === "error" && <p className="form-error" role="alert">{message}</p>}
              <div className="form-actions"><button className="back-link" type="button" onClick={() => setStep(1)}>← Back</button><button className="button button-dark" type="submit" disabled={status === "saving"}>{status === "saving" ? "Saving..." : "Finish and save"} <span>→</span></button></div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
