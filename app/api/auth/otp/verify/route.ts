import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { afroMessageQuery, afroMessageToken, normalizeEthiopianPhone, readAfroMessageResponse } from "../shared";

export async function POST(request: Request) {
  try {
    const identity = await getChatGPTUser();
    if (!identity) return Response.json({ error: "Sign in is required before verifying a phone number." }, { status: 401 });
    const { phone: rawPhone, code: rawCode } = await request.json() as { phone?: string; code?: string };
    const phone = normalizeEthiopianPhone(rawPhone);
    const code = typeof rawCode === "string" ? rawCode.replace(/\D/g, "") : "";
    if (!phone || !/^\d{6}$/.test(code)) return Response.json({ error: "Enter the six-digit code sent to your phone." }, { status: 400 });
    const token = afroMessageToken();
    if (!token) return Response.json({ error: "Phone verification is temporarily unavailable." }, { status: 503 });

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const challenge = await env.DB.prepare(`SELECT user_id FROM phone_verification_challenges
      WHERE user_id=? AND phone=? AND last_sent_at>=?`).bind(identity.userId, phone, fiveMinutesAgo).first();
    if (!challenge) return Response.json({ error: "Request a new code before trying to verify this number." }, { status: 400 });
    const owner = await env.DB.prepare("SELECT id FROM users WHERE phone=? AND id!=?").bind(phone, identity.userId).first();
    if (owner) return Response.json({ error: "This phone number is already connected to another account." }, { status: 409 });

    const query = afroMessageQuery(phone);
    query.set("code", code);
    const response = await fetch(`https://api.afromessage.com/api/verify?${query}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!await readAfroMessageResponse(response)) return Response.json({ error: "That code is incorrect or expired." }, { status: 400 });
    await env.DB.batch([
      env.DB.prepare(`UPDATE users SET phone=?,phone_verified_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .bind(phone, identity.userId),
      env.DB.prepare("DELETE FROM phone_verification_challenges WHERE user_id=?").bind(identity.userId),
    ]);
    return Response.json({ verified: true });
  } catch {
    return Response.json({ error: "We could not verify the code right now. Please try again." }, { status: 500 });
  }
}
