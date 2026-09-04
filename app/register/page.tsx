"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const endpoint = stage === "phone" ? "/api/auth/otp/send" : "/api/auth/otp/verify";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(stage === "phone" ? { phone } : { phone, code }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Phone verification could not be completed.");
      if (stage === "phone") setStage("code");
      else window.location.assign("/onboarding");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Phone verification could not be completed.");
    } finally {
      setLoading(false);
    }
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
          <form onSubmit={submit}>
            <h2>Create your account</h2>
            <p>{stage === "phone" ? "Enter your Ethiopian phone number. We will send a six-digit verification code." : "Enter the six-digit code sent to your phone. It expires after five minutes."}</p>
            {stage === "phone" ? <>
              <label className="field-label" htmlFor="phone">Phone number</label>
              <div className="phone-field"><span>+251</span><input id="phone" inputMode="tel" autoComplete="tel" placeholder="9XX XXX XXX" value={phone} onChange={(event) => { setPhone(event.target.value); setError(""); }} required /></div>
              <label className="consent-row"><input type="checkbox" required /><span>I agree to Debal&apos;s safety rules and terms of use.</span></label>
            </> : <>
              <label className="field-label" htmlFor="code">Verification code</label>
              <div className="phone-field"><span>Code</span><input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "")); setError(""); }} required /></div>
              <button type="button" className="clear-filters" onClick={() => { setStage("phone"); setCode(""); setError(""); }}>Use a different number or resend</button>
            </>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button primary-wide" type="submit" disabled={loading}>{loading ? "Please wait…" : stage === "phone" ? "Send verification code" : "Verify and continue"} <span>→</span></button>
            <p className="auth-footnote">Your phone number stays private and is not shown publicly.</p>
          </form>
        </div>
      </section>
    </main>
  );
}
