"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type LocalUser = { userId: string; email: string; displayName: string };

export default function RegisterPage() {
  const [authMode, setAuthMode] = useState<"checking" | "local" | "phone">("checking");
  const [localAction, setLocalAction] = useState<"register" | "login">("register");
  const [localUser, setLocalUser] = useState<LocalUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/auth/local/session").then(async (response) => {
      const text = await response.text();
      const data = text ? JSON.parse(text) as { enabled?: boolean; user?: LocalUser | null } : {};
      if (response.ok && data.enabled) { setAuthMode("local"); setLocalUser(data.user ?? null); }
      else setAuthMode("phone");
    }).catch(() => setAuthMode("phone"));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      if (authMode === "local") {
        const endpoint = localAction === "register" ? "/api/auth/local/register" : "/api/auth/local/login";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ displayName, email, password }),
        });
        const text = await response.text();
        const data = text ? JSON.parse(text) as { error?: string } : {};
        if (!response.ok) throw new Error(data.error || "The account request could not be completed.");
        window.location.assign(localAction === "register" ? "/onboarding" : "/");
        return;
      }

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
      setError(caught instanceof Error ? caught.message : "The account request could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  async function signOutLocalUser() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/auth/local/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      setLocalUser(null);
    } catch {
      setError("The local account could not be signed out.");
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
          <p>Create one trusted profile, then choose whether you want to find a home, meet a roommate, list a property—or do all three.</p>
          <div className="auth-points"><span>✓ Ethiopian locations and budgets</span><span>✓ Private contact information</span><span>✓ Compatibility before conversation</span></div>
        </div>
        <div className="auth-card">
          {authMode === "checking" ? <div className="auth-loading"><strong>Preparing sign in…</strong></div> : authMode === "local" && localUser ? (
            <div className="auth-signed-in"><span className="integration-note"><strong>Local preview</strong> Verification is bypassed only on localhost.</span><h2>Welcome back, {localUser.displayName}.</h2><p>You are signed in as {localUser.email} and can use protected Debal operations in this preview.</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="local-account-actions"><Link className="button button-dark" href="/">Continue to Debal <span>→</span></Link><button className="clear-filters" type="button" disabled={loading} onClick={() => void signOutLocalUser()}>Sign out or switch account</button></div></div>
          ) : (
            <form onSubmit={submit}>
              {authMode === "local" ? <>
                <span className="integration-note"><strong>Local preview</strong> Phone verification is bypassed only on localhost and remains required in production.</span>
                <h2>{localAction === "register" ? "Create a local account" : "Sign in locally"}</h2>
                <p>{localAction === "register" ? "Use test credentials to register and try every protected workflow." : "Use an account created in this local preview."}</p>
                <div className="local-auth-fields">{localAction === "register" && <label><span>Name</span><input autoComplete="name" value={displayName} onChange={(event) => { setDisplayName(event.target.value); setError(""); }} required /></label>}<label><span>Email</span><input type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} required /></label><label><span>Password</span><input type="password" minLength={8} maxLength={128} autoComplete={localAction === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} required /></label></div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="button primary-wide" type="submit" disabled={loading}>{loading ? "Please wait…" : localAction === "register" ? "Register and continue" : "Sign in"} <span>→</span></button>
                <p className="auth-footnote">{localAction === "register" ? "Already registered?" : "Need a local account?"} <button type="button" onClick={() => { setLocalAction(localAction === "register" ? "login" : "register"); setError(""); }}>{localAction === "register" ? "Sign in" : "Register"}</button></p>
              </> : <>
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
              </>}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
