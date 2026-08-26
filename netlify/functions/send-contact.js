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

  const nombre = (data.nombre || "").toString().trim();
  if (!nombre) {
    return json(400, { error: "Faltan campos obligatorios" });
  }

  const lines = Object.entries(data)
    .filter(([key, value]) => !key.startsWith("_") && value)
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
