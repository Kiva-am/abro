import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { afroMessageQuery, afroMessageToken, normalizeEthiopianPhone, readAfroMessageResponse } from "../shared";

export async function POST(request: Request) {
  try {
    const identity = await getChatGPTUser();
    if (!identity) return Response.json({ error: "Sign in is required before verifying a phone number." }, { status: 401 });
    const { phone: rawPhone } = await request.json() as { phone?: string };
    const phone = normalizeEthiopianPhone(rawPhone);
    if (!phone) return Response.json({ error: "Enter a valid Ethiopian mobile number." }, { status: 400 });
    const token = afroMessageToken();
    if (!token) return Response.json({ error: "Phone verification is temporarily unavailable." }, { status: 503 });

    await env.DB.prepare(`INSERT INTO users (id,email) VALUES (?,?)
      ON CONFLICT(id) DO UPDATE SET email=excluded.email,updated_at=CURRENT_TIMESTAMP`)
      .bind(identity.userId, identity.email).run();
    await env.DB.prepare("INSERT INTO phone_verification_challenges (user_id,phone) VALUES (?,?) ON CONFLICT(user_id) DO NOTHING")
      .bind(identity.userId, phone).run();

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const minuteAgo = new Date(now.getTime() - 60 * 1000).toISOString();
    const reservation = await env.DB.prepare(`UPDATE phone_verification_challenges SET
      phone=?,send_count=CASE WHEN window_started_at<=? THEN 1 ELSE send_count+1 END,
      window_started_at=CASE WHEN window_started_at<=? THEN ? ELSE window_started_at END,last_sent_at=?
      WHERE user_id=? AND last_sent_at<=? AND (window_started_at<=? OR send_count<5)`)
      .bind(phone, hourAgo, hourAgo, now.toISOString(), now.toISOString(), identity.userId, minuteAgo, hourAgo).run();
    if (!reservation.meta.changes) {
      return Response.json({ error: "Please wait before requesting another code. You can send up to five codes per hour." }, { status: 429 });
    }

    const query = afroMessageQuery(phone);
    query.set("pr", "Your Debal verification code is");
    query.set("ttl", "300");
    query.set("len", "6");
    query.set("t", "0");
    const response = await fetch(`https://api.afromessage.com/api/challenge?${query}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!await readAfroMessageResponse(response)) return Response.json({ error: "We could not send a code right now. Please try again." }, { status: 502 });
    return Response.json({ sent: true });
  } catch {
    return Response.json({ error: "We could not send a code right now. Please try again." }, { status: 500 });
  }
}
