import { env } from "cloudflare:workers";

export type NotificationType = "message" | "viewing" | "application" | "verification" | "offer";

export function notificationStatement(userId: string, type: NotificationType, title: string, body: string, href: string) {
  return env.DB.prepare(`INSERT INTO notifications (user_id,type,title,body,href) VALUES (?,?,?,?,?)`)
    .bind(userId, type, title.slice(0, 140), body.slice(0, 400), href.slice(0, 300));
}
