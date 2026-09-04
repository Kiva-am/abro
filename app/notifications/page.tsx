"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Notification = { id: number; type: "message" | "viewing" | "application" | "verification" | "offer"; title: string; body: string; href: string; readAt: string | null; createdAt: string };
const symbols = { message: "M", viewing: "V", application: "A", verification: "✓", offer: "O" };

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch("/api/notifications").then(async (response) => { const text = await response.text(); const data = text ? JSON.parse(text) as { notifications?: Notification[]; error?: string } : {}; if (!response.ok) throw new Error(data.error || "Unable to load notifications."); if (active) setItems(data.notifications ?? []); }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load notifications."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const unreadCount = useMemo(() => items.filter((item) => !item.readAt).length, [items]);

  async function open(item: Notification) {
    if (!item.readAt) {
      await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id }) }).catch(() => undefined);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
    }
    const destination = item.href.startsWith("/") && !item.href.startsWith("//") ? item.href : "/notifications";
    router.push(destination);
  }
  async function markAll() {
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
    if (!response.ok) { setError("Unable to mark notifications as read."); return; }
    const now = new Date().toISOString(); setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || now })));
  }

  return <main className="notifications-page"><header className="site-header shell market-header"><Link className="brand" href="/"><span className="brand-logo" /></Link><nav><Link href="/listings">Browse homes</Link><Link href="/applications">Applications</Link><Link href="/rental-offers">Offers</Link><Link href="/viewings">Viewings</Link><Link href="/messages">Messages</Link></nav><Link className="button button-dark" href="/dashboard">Dashboard</Link></header><section className="notifications-shell shell"><div className="notifications-heading"><div><span className="eyebrow">YOUR ACTIVITY</span><h1>Notifications</h1><p>Messages and important updates about applications, offers, viewings, and verification appear here.</p></div>{unreadCount > 0 && <button onClick={() => void markAll()}>Mark all as read</button>}</div>{error && <p className="form-error dashboard-error">{error}</p>}{loading ? <p>Loading notifications…</p> : items.length === 0 ? <div className="empty-state"><strong>You are all caught up.</strong><p>New activity will appear here.</p><Link className="button button-dark" href="/listings">Browse homes</Link></div> : <div className="notification-list">{items.map((item) => <button className={`notification-row ${item.readAt ? "read" : "unread"}`} key={item.id} onClick={() => void open(item)}><span className={`notification-symbol ${item.type}`}>{symbols[item.type]}</span><div><strong>{item.title}</strong><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</small></div>{!item.readAt && <i aria-label="Unread" />}</button>)}</div>}</section></main>;
}
