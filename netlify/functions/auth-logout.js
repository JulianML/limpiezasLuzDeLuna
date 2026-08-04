import { buildClearCookie, json, methodNotAllowed, isProd } from "../../lib/auth.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed(["POST"]);
  }
  return json(200, { ok: true }, { "Set-Cookie": buildClearCookie(isProd()) });
}
