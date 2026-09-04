import { getChatGPTUser } from "@/app/chatgpt-auth";
import { localDevAuthEnabled } from "@/lib/local-dev-auth";

export async function GET(request: Request) {
  if (!localDevAuthEnabled(new URL(request.url).hostname)) return Response.json({ enabled: false }, { status: 404 });
  const user = await getChatGPTUser();
  return Response.json({
    enabled: true,
    user: user ? { userId: user.userId, email: user.email, displayName: user.displayName } : null,
  });
}
