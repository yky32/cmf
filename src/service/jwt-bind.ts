import type { IncomingMessage } from "http";

/**
 * Bind PROFILE_ALIAS at WSS upgrade from the access token so skip-A
 * works even when join-chat-room omits `alias` (tgt-rn today).
 * Payload is decoded only — CMF does not verify JWKS.
 */
export function extractAccessToken(req?: IncomingMessage): string {
  if (!req) {
    return "";
  }
  const header = req.headers?.authorization;
  if (typeof header === "string" && header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  try {
    const host = req.headers?.host || "localhost";
    const url = new URL(req.url || "/", `http://${host}`);
    return (url.searchParams.get("access_token") || url.searchParams.get("token") || "").trim();
  } catch {
    return "";
  }
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function aliasFromJwtPayload(payload: Record<string, unknown> | null): string {
  if (!payload) {
    return "";
  }
  const direct = firstNonBlank(
    payload.alias,
    payload.preferred_username,
    payload.profileAlias,
  );
  if (direct) {
    return canonAlias(direct);
  }
  const metadata = payload.metadata;
  if (metadata && typeof metadata === "object") {
    const meta = metadata as Record<string, unknown>;
    const fromMeta = firstNonBlank(meta.alias, meta.profileAlias);
    if (fromMeta) {
      return canonAlias(fromMeta);
    }
    const identifier = typeof meta.identifier === "string" ? meta.identifier.trim() : "";
    // email is not PROFILE_ALIAS — only use a handle-shaped identifier
    if (identifier && !identifier.includes("@") && !identifier.includes(" ")) {
      return canonAlias(identifier);
    }
  }
  return "";
}

function firstNonBlank(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function canonAlias(alias: string): string {
  return alias.trim().replace(/^@/, "").toLowerCase();
}
