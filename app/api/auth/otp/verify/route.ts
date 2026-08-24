import { afroMessageQuery, afroMessageToken, normalizeEthiopianPhone, readAfroMessageResponse } from "../shared";

export async function POST(request: Request) {
  try {
    const { phone: rawPhone, code: rawCode } = await request.json() as { phone?: string; code?: string };
    const phone = normalizeEthiopianPhone(rawPhone);
    const code = typeof rawCode === "string" ? rawCode.replace(/\D/g, "") : "";
    if (!phone || !/^\d{6}$/.test(code)) return Response.json({ error: "Enter the six-digit code sent to your phone." }, { status: 400 });
    const token = afroMessageToken();
    if (!token) return Response.json({ error: "Phone verification is temporarily unavailable." }, { status: 503 });

    const query = afroMessageQuery(phone);
    query.set("code", code);
    const response = await fetch(`https://api.afromessage.com/api/verify?${query}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!await readAfroMessageResponse(response)) return Response.json({ error: "That code is incorrect or expired." }, { status: 400 });
    return Response.json({ verified: true });
  } catch {
    return Response.json({ error: "We could not verify the code right now. Please try again." }, { status: 500 });
  }
}
