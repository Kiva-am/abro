import { afroMessageQuery, afroMessageToken, normalizeEthiopianPhone, readAfroMessageResponse } from "../shared";

export async function POST(request: Request) {
  try {
    const { phone: rawPhone } = await request.json() as { phone?: string };
    const phone = normalizeEthiopianPhone(rawPhone);
    if (!phone) return Response.json({ error: "Enter a valid Ethiopian mobile number." }, { status: 400 });
    const token = afroMessageToken();
    if (!token) return Response.json({ error: "Phone verification is temporarily unavailable." }, { status: 503 });

    const query = afroMessageQuery(phone);
    query.set("pr", "Your Debal verification code is");
    query.set("ttl", "300");
    query.set("len", "6");
    query.set("t", "0");
    const response = await fetch(`https://api.afromessage.com/api/challenge?${query}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!await readAfroMessageResponse(response)) return Response.json({ error: "We could not send a code right now. Please try again." }, { status: 502 });
    return Response.json({ sent: true, phone });
  } catch {
    return Response.json({ error: "We could not send a code right now. Please try again." }, { status: 500 });
  }
}
