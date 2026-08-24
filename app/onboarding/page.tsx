"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ethiopianCities } from "@/lib/ethiopian-locations";

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [city, setCity] = useState("Addis Ababa");
  const neighborhoods = useMemo(() => ethiopianCities.find((item) => item.name === city)?.neighborhoods ?? [], [city]);

  return (
    <main className="onboarding-page">
      <header className="onboarding-header shell"><Link className="brand" href="/"><span className="brand-mark">A</span><span>abro</span></Link><span>Your profile is private until you publish it.</span></header>
      <div className="onboarding-layout shell">
        <aside className="onboarding-aside"><span className="eyebrow">SET UP YOUR PROFILE</span><h1>Help Abro find the right fit.</h1><p>Your answers improve housing results and roommate compatibility. You can change them later.</p><ol><li className={step === 1 ? "active" : "done"}><span>{step === 1 ? "1" : "✓"}</span><div><strong>About you</strong><small>Basic profile and location</small></div></li><li className={step === 2 ? "active" : ""}><span>2</span><div><strong>Your preferences</strong><small>Budget, room and lifestyle</small></div></li></ol></aside>
        <section className="onboarding-card">
          {step === 1 ? (
            <form onSubmit={(event) => { event.preventDefault(); setStep(2); }}>
              <div className="form-heading"><span>01</span><div><h2>Tell us about yourself</h2><p>Only share what helps others understand who they may live with.</p></div></div>
              <div className="form-grid two"><label><span>First name</span><input required placeholder="Hana" /></label><label><span>Occupation</span><input placeholder="Student, designer, engineer..." /></label></div>
              <div className="form-grid two"><label><span>City</span><select value={city} onChange={(event) => setCity(event.target.value)}>{ethiopianCities.map((item) => <option key={item.slug}>{item.name}</option>)}</select></label><label><span>Neighborhood</span><select key={city}>{neighborhoods.map((name) => <option key={name}>{name}</option>)}</select></label></div>
              <label className="full-field"><span>Short introduction</span><textarea rows={4} placeholder="A little about your work, studies, and what makes a comfortable home for you." /></label>
              <div className="form-actions"><Link href="/">Save and leave</Link><button className="button button-dark" type="submit">Housing preferences <span>→</span></button></div>
            </form>
          ) : (
            <form onSubmit={(event) => event.preventDefault()}>
              <div className="form-heading"><span>02</span><div><h2>What are you looking for?</h2><p>These answers become your starting search and match criteria.</p></div></div>
              <div className="form-grid two"><label><span>Minimum budget (ETB)</span><input type="number" min="0" defaultValue="3000" /></label><label><span>Maximum budget (ETB)</span><input type="number" min="0" defaultValue="10000" /></label></div>
              <div className="form-grid two"><label><span>Room type</span><select><option>Private room</option><option>Shared room</option><option>Apartment</option><option>House</option></select></label><label><span>Move-in date</span><input type="date" /></label></div>
              <fieldset className="choice-group"><legend>Lifestyle</legend><div className="choice-grid"><label><input type="checkbox" /><span>Non-smoker</span></label><label><input type="checkbox" /><span>Pet friendly</span></label><label><input type="checkbox" /><span>Quiet home</span></label><label><input type="checkbox" /><span>Early sleeper</span></label><label><input type="checkbox" /><span>Guests okay</span></label><label><input type="checkbox" /><span>Very tidy</span></label></div></fieldset>
              <div className="privacy-box"><strong>What others will see</strong><p>Your name, introduction, general location and lifestyle preferences. Phone numbers and identity documents are never displayed publicly.</p></div>
              <div className="form-actions"><button className="back-link" type="button" onClick={() => setStep(1)}>← Back</button><Link className="button button-dark" href="/">Finish profile <span>→</span></Link></div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
