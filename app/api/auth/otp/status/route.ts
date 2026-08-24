import { env } from "cloudflare:workers";

export async function GET() {
  const bindings = Object.keys(env).filter((key) => key.includes("AFRO") || key.includes("SMS"));
  const token = (env as Record<string, unknown>).AFROMESSAGE_API_TOKEN;
  return Response.json({ bindings, tokenType: typeof token, tokenLength: typeof token === "string" ? token.length : null });
}
