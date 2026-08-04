import {
  checkPassword,
  signSession,
  buildSessionCookie,
  json,
  methodNotAllowed,
  isProd,
} from "../../lib/auth.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "JSON inválido" });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!checkPassword(password)) {
    // Pequeño delay para mitigar fuerza bruta
    await new Promise((r) => setTimeout(r, 400));
    return json(401, { error: "Contraseña incorrecta" });
  }

  const token = await signSession();
  return json(
    200,
    { ok: true, user: { role: "admin" } },
    { "Set-Cookie": buildSessionCookie(token, isProd()) }
  );
}
