import { env } from "cloudflare:workers";

export async function GET() {
  const bindings = Object.keys(env).filter((key) => key.includes("AFRO") || key.includes("SMS"));
  return Response.json({ bindings });
}
