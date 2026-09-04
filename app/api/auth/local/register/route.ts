import { env } from "cloudflare:workers";
import { createLocalDevSession, localDevAuthEnabled, localDevSessionCookie, passwordCredentials } from "@/lib/local-dev-auth";

export async function POST(request: Request) {
  if (!localDevAuthEnabled(new URL(request.url).hostname)) return Response.json({ error: "Not found." }, { status: 404 });
  try {
    const payload = await request.json() as { displayName?: string; email?: string; password?: string };
    const displayName = typeof payload.displayName === "string" ? payload.displayName.trim().slice(0, 80) : "";
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase().slice(0, 254) : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    if (displayName.length < 2) return Response.json({ error: "Enter your name." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8 || password.length > 128) return Response.json({ error: "Use a password between 8 and 128 characters." }, { status: 400 });

    const existing = await env.DB.prepare("SELECT id FROM users WHERE email=? COLLATE NOCASE").bind(email).first();
    if (existing) return Response.json({ error: "An account with this email already exists. Sign in instead." }, { status: 409 });

    const userId = `dev-${crypto.randomUUID()}`;
    const credentials = await passwordCredentials(password);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id,email) VALUES (?,?)").bind(userId, email),
      env.DB.prepare("INSERT INTO dev_accounts (user_id,display_name,password_hash,password_salt) VALUES (?,?,?,?)")
        .bind(userId, displayName, credentials.hash, credentials.salt),
    ]);
    const token = await createLocalDevSession(userId);
    const response = Response.json({ registered: true, user: { userId, email, displayName } }, { status: 201 });
    response.headers.append("Set-Cookie", localDevSessionCookie(token));
    return response;
  } catch {
    return Response.json({ error: "The local account could not be created." }, { status: 500 });
  }
}
