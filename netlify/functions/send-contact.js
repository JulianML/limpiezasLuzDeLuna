import nodemailer from "nodemailer";
import { json, methodNotAllowed } from "../../lib/auth.js";

const FIELD_LABELS = {
  nombre: "Nombre",
  telefono: "Teléfono",
  email: "Email",
  servicio: "Servicio",
  zona: "Zona / Dirección",
  mensaje: "Mensaje",
};

function parseBody(event) {
  const contentType = (event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
  const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf-8") : event.body || "";
  if (contentType.includes("application/json")) {
    return JSON.parse(raw || "{}");
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER y GMAIL_APP_PASSWORD deben estar definidas");
  }
  transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return transporter;
}

// Tiempo mínimo (ms) entre que se carga el formulario y se envía. main.js manda
// este campo automáticamente; los bots que hacen POST directo al endpoint sin
// pasar por la página no lo incluyen, o lo hacen en 0 ms.
const MIN_ELAPSED_MS = 2000;

async function verifyTurnstile(token) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // no configurado todavía: no bloquear envíos
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const result = await res.json();
    return !!result.success;
  } catch (err) {
    console.error("send-contact: fallo al verificar Turnstile", err);
    return false;
  }
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  let data;
  try {
    data = parseBody(event);
  } catch {
    return json(400, { error: "Solicitud inválida" });
  }

  // Honeypot: si un bot rellena este campo oculto, respondemos OK sin enviar nada.
  if (data._gotcha) {
    return json(200, { ok: true });
  }

  // Time-trap: descarta envíos que no pasaron por la página (sin _elapsed) o que
  // llegaron sospechosamente rápido para ser un humano rellenando el formulario.
  const elapsed = Number(data._elapsed);
  if (!Number.isFinite(elapsed) || elapsed < MIN_ELAPSED_MS) {
    return json(200, { ok: true });
  }

  const turnstileOk = await verifyTurnstile(data["cf-turnstile-response"]);
  if (!turnstileOk) {
    return json(400, { error: "Verificación anti-spam fallida" });
  }

  const nombre = (data.nombre || "").toString().trim();
  if (!nombre) {
    return json(400, { error: "Faltan campos obligatorios" });
  }

  const email = (data.email || "").toString().trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: "Email inválido" });
  }

  for (const value of Object.values(data)) {
    if (typeof value === "string" && value.length > 5000) {
      return json(400, { error: "Campo demasiado largo" });
    }
  }

  // Heurística simple: mensajes con varios enlaces suelen ser spam.
  const freeText = `${data.mensaje || ""} ${data.zona || ""}`;
  const urlCount = (freeText.match(/https?:\/\//gi) || []).length;
  if (urlCount > 1) {
    return json(200, { ok: true });
  }

  const EXCLUDED_KEYS = new Set(["_elapsed", "cf-turnstile-response"]);
  const lines = Object.entries(data)
    .filter(([key, value]) => !key.startsWith("_") && !EXCLUDED_KEYS.has(key) && value)
    .map(([key, value]) => `${FIELD_LABELS[key] || key}: ${value}`);

  try {
    const user = process.env.GMAIL_USER;
    await getTransporter().sendMail({
      from: `"Web Limpiezas Luz de Luna" <${user}>`,
      to: "limpiezas.luzdeluna@gmail.com",
      replyTo: typeof data.email === "string" && data.email ? data.email : undefined,
      subject: (data._subject || "Nuevo mensaje desde la web").toString(),
      text: lines.join("\n"),
    });
  } catch (err) {
    console.error("send-contact: fallo al enviar email", err);
    return json(502, { error: "No se pudo enviar el email" });
  }

  return json(200, { ok: true });
}
