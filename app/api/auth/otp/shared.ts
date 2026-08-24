import { env } from "cloudflare:workers";

const ETHIOPIAN_MOBILE = /^\+251[79]\d{8}$/;

type SmsEnvironment = {
  AFROMESSAGE_API_TOKEN?: string;
  AFROMESSAGE_SENDER?: string;
  AFROMESSAGE_IDENTIFIER_ID?: string;
};

function smsEnvironment() {
  return env as SmsEnvironment;
}

export function normalizeEthiopianPhone(value: unknown) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("251") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  const phone = `+251${local}`;
  return ETHIOPIAN_MOBILE.test(phone) ? phone : null;
}

export function afroMessageToken() {
  return smsEnvironment().AFROMESSAGE_API_TOKEN?.trim() || "";
}

export function afroMessageQuery(phone: string) {
  const runtime = smsEnvironment();
  const query = new URLSearchParams({ to: phone, sender: runtime.AFROMESSAGE_SENDER?.trim() || "Debal" });
  const identifier = runtime.AFROMESSAGE_IDENTIFIER_ID?.trim();
  if (identifier) query.set("from", identifier);
  return query;
}

export async function readAfroMessageResponse(response: Response) {
  const body = await response.json().catch(() => null) as { acknowledge?: string } | null;
  return response.ok && body?.acknowledge === "success";
}
