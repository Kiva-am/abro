"use client";

import { useEffect, useState } from "react";

type Props = { targetType: "listing" | "member"; listingId?: number; userId: string; compact?: boolean; onBlockChange?: (blocked: boolean) => void };
const reasonLabels: Record<string, string> = { scam: "Possible scam", inaccurate: "False or inaccurate information", harassment: "Harassment", discrimination: "Discrimination", unsafe: "Unsafe behavior", spam: "Spam", other: "Something else" };

export default function SafetyActions({ targetType, listingId, userId, compact = false, onBlockChange }: Props) {
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState("scam");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { void fetch(`/api/blocks?userId=${encodeURIComponent(userId)}`).then((response) => response.text()).then((text) => text ? JSON.parse(text) as { blocked?: boolean } : {}).then((data) => setBlocked(Boolean(data.blocked))).catch(() => undefined); }, [userId]);

  async function report(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetType, listingId, userId, reason, details }) });
      const text = await response.text(); const data = text ? JSON.parse(text) as { error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Unable to submit report.");
      setMessage("Report submitted. Debal moderators can now review it."); setDetails("");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Unable to submit report."); }
    finally { setSaving(false); }
  }

  async function toggleBlock() {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/blocks", { method: blocked ? "DELETE" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId }) });
      const text = await response.text(); const data = text ? JSON.parse(text) as { error?: string; blocked?: boolean } : {};
      if (!response.ok) throw new Error(data.error || "Unable to update blocking.");
      setBlocked(Boolean(data.blocked)); onBlockChange?.(Boolean(data.blocked)); setMessage(data.blocked ? "Member blocked. They can no longer message you." : "Member unblocked.");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Unable to update blocking."); }
    finally { setSaving(false); }
  }

  return <div className={`safety-actions ${compact ? "compact" : ""}`}><details><summary>Report {targetType === "listing" ? "this listing" : "this member"}</summary><form onSubmit={report}><label><span>Reason</span><select value={reason} onChange={(event) => setReason(event.target.value)}>{Object.entries(reasonLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label><span>What happened?</span><textarea rows={3} maxLength={1000} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Share details that will help a moderator review this." /></label><button className="button button-dark" disabled={saving}>Submit report</button></form></details><button className="block-action" type="button" disabled={saving} onClick={() => void toggleBlock()}>{blocked ? "Unblock member" : "Block this member"}</button>{message && <p>{message}</p>}</div>;
}
