"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/otp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to send verification code.");
      setStep("code");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to send verification code."); }
    finally { setBusy(false); }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to verify code.");
      window.location.assign("/onboarding");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to verify code."); setBusy(false); }
  }

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
            <form onSubmit={sendCode}>
              <h2>Create your account</h2><p>We&apos;ll use your Ethiopian phone number to protect your account.</p>
              <label className="field-label" htmlFor="phone">Phone number</label>
              <div className="phone-field"><span>+251</span><input id="phone" inputMode="tel" placeholder="9XX XXX XXX" value={phone} onChange={(event) => setPhone(event.target.value)} required /></div>
              <label className="consent-row"><input type="checkbox" required /><span>I agree to Debal&apos;s safety rules and terms of use.</span></label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button primary-wide" type="submit" disabled={busy}>{busy ? "Sending…" : "Send verification code"} <span>→</span></button>
              <p className="auth-footnote">Already have an account? <button type="button">Sign in</button></p>
            </form>
          ) : (
            <form onSubmit={verifyCode}>
              <button className="back-link" type="button" onClick={() => { setStep("phone"); setError(""); setCode(""); }}>← Change number</button>
              <h2>Verify your phone</h2><p>Enter the six-digit code sent to +251 {phone || "9XX XXX XXX"}.</p>
              <label className="field-label" htmlFor="code">Verification code</label><input className="code-field" id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button primary-wide" type="submit" disabled={busy}>{busy ? "Verifying…" : "Continue to profile"} <span>→</span></button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
