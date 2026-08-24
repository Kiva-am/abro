"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  function continueToProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const digits = phone.replace(/\D/g, "");
    const local = digits.startsWith("251") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
    if (!/^[79]\d{8}$/.test(local)) {
      setError("Enter a valid Ethiopian mobile number.");
      return;
    }
    window.location.assign("/onboarding");
  }

  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/" aria-label="Debal home"><span className="brand-logo" aria-hidden="true" /></Link>
      <section className="auth-shell">
        <div className="auth-story">
          <span className="eyebrow light">WELCOME TO DEBAL</span>
          <h1>A safer start to your next home.</h1>
          <p>Create one trusted profile to find rooms, list a place, and meet compatible roommates across Ethiopia.</p>
          <div className="auth-points"><span>✓ Ethiopian locations and budgets</span><span>✓ Private contact information</span><span>✓ Compatibility before conversation</span></div>
        </div>
        <div className="auth-card">
          <form onSubmit={continueToProfile}>
            <h2>Create your account</h2>
            <p>Enter your Ethiopian phone number, then continue to create your Debal profile.</p>
            <label className="field-label" htmlFor="phone">Phone number</label>
            <div className="phone-field"><span>+251</span><input id="phone" inputMode="tel" autoComplete="tel" placeholder="9XX XXX XXX" value={phone} onChange={(event) => { setPhone(event.target.value); setError(""); }} required /></div>
            <label className="consent-row"><input type="checkbox" required /><span>I agree to Debal&apos;s safety rules and terms of use.</span></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button primary-wide" type="submit">Continue to profile <span>→</span></button>
            <p className="auth-footnote">Your phone number stays private and is not shown publicly.</p>
          </form>
        </div>
      </section>
    </main>
  );
}
