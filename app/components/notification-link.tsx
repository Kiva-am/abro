"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotificationLink() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    void fetch("/api/notifications?summary=1").then(async (response) => {
      const text = await response.text();
      if (!response.ok || !text) return;
      const data = JSON.parse(text) as { unreadCount?: number };
      if (active) setCount(data.unreadCount ?? 0);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return <Link className="notification-link" href="/notifications" aria-label={count ? `${count} unread notifications` : "Notifications"}><span>Alerts</span>{count > 0 && <b>{count > 99 ? "99+" : count}</b>}</Link>;
}
