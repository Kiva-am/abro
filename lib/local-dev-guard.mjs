export function localDevAuthEnabled(host, runtimeMode = process.env.NODE_ENV) {
  if (runtimeMode !== "development") return false;
  const value = (host ?? "").trim().toLowerCase();
  const hostname = value.startsWith("[") ? value.slice(0, value.indexOf("]") + 1) : value.split(":")[0];
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
