import { env } from "cloudflare:workers";
import { createLocalDevSession, localDevAuthEnabled, localDevSessionCookie, passwordMatches } from "@/lib/local-dev-auth";

type Account = { userId: string; displayName: string; email: string; passwordHash: string; passwordSalt: string; status: string };

export async function POST(request: Request) {
  if (!localDevAuthEnabled(new URL(request.url).hostname)) return Response.json({ error: "Not found." }, { status: 404 });
  try {
    const payload = await request.json() as { email?: string; password?: string };
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase().slice(0, 254) : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    const account = await env.DB.prepare(`SELECT a.user_id AS userId,a.display_name AS displayName,
      a.password_hash AS passwordHash,a.password_salt AS passwordSalt,u.email,u.status
      FROM dev_accounts a JOIN users u ON u.id=a.user_id WHERE u.email=? COLLATE NOCASE`)
      .bind(email).first<Account>();
    if (!account || account.status !== "active" || !await passwordMatches(password, account.passwordSalt, account.passwordHash)) {
      return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    const token = await createLocalDevSession(account.userId);
    const response = Response.json({ signedIn: true, user: { userId: account.userId, email: account.email, displayName: account.displayName } });
    response.headers.append("Set-Cookie", localDevSessionCookie(token));
    return response;
  } catch {
    return Response.json({ error: "The local account could not be signed in." }, { status: 500 });
  }
}
