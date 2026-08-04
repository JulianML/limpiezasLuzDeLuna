import { isAuthenticated, json, methodNotAllowed } from "../../lib/auth.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed(["GET"]);
  }
  const authed = await isAuthenticated(event);
  return json(200, { ok: true, authenticated: authed, user: authed ? { role: "admin" } : null });
}
