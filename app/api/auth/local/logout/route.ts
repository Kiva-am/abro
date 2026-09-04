import { clearLocalDevSessionCookie, destroyLocalDevSession, localDevAuthEnabled } from "@/lib/local-dev-auth";

export async function POST(request: Request) {
  if (!localDevAuthEnabled(new URL(request.url).hostname)) return Response.json({ error: "Not found." }, { status: 404 });
  await destroyLocalDevSession(request.headers.get("cookie"));
  const response = Response.json({ signedOut: true });
  response.headers.append("Set-Cookie", clearLocalDevSessionCookie());
  return response;
}
