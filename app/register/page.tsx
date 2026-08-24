"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");

  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/" aria-label="Debal home"><span className="brand-logo" aria-hidden="true" /></Link>
      <section className="auth-shell">
        <div className="auth-story">
          <span className="eyebrow light">WELCOME TO DEBAL</span>
          <h1>A safer start to your next home.</h1>
          <p>Create one trusted profile to find rooms, list a place, and meet compatible roommates across Ethiopia.</p>
          <div className="auth-points"><span>✓ Ethiopian locations and budgets</span><span>✓ Verification without exposing private ID data</span><span>✓ Compatibility before conversation</span></div>
        </div>
        <div className="auth-card">
          <div className="step-label">Step {step === "phone" ? "1" : "2"} of 2</div>
          {step === "phone" ? (
            <form onSubmit={(event) => { event.preventDefault(); setStep("code"); }}>
              <h2>Create your account</h2><p>We&apos;ll use your Ethiopian phone number to protect your account.</p>
              <label className="field-label" htmlFor="phone">Phone number</label>
              <div className="phone-field"><span>+251</span><input id="phone" inputMode="tel" placeholder="9XX XXX XXX" value={phone} onChange={(event) => setPhone(event.target.value)} required /></div>
              <label className="consent-row"><input type="checkbox" required /><span>I agree to Debal&apos;s safety rules and terms of use.</span></label>
              <button className="button primary-wide" type="submit">Send verification code <span>→</span></button>
              <p className="auth-footnote">Already have an account? <button type="button">Sign in</button></p>
            </form>
          ) : (
            <form onSubmit={(event) => event.preventDefault()}>
              <button className="back-link" type="button" onClick={() => setStep("phone")}>← Change number</button>
              <h2>Verify your phone</h2><p>Enter the six-digit code sent to +251 {phone || "9XX XXX XXX"}.</p>
              <label className="field-label" htmlFor="code">Verification code</label><input className="code-field" id="code" inputMode="numeric" maxLength={6} placeholder="000000" required />
              <div className="integration-note"><strong>Development note</strong><span>SMS delivery will be connected after an OTP provider is selected. No code is sent in this prototype.</span></div>
              <Link className="button primary-wide" href="/onboarding">Continue to profile <span>→</span></Link>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
