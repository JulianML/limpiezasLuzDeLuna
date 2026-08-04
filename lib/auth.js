import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "luna_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 h

let _secret = null;

function getSecret() {
  if (_secret) return _secret;
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error("JWT_SECRET debe estar definido y tener al menos 32 caracteres");
  }
  _secret = new TextEncoder().encode(raw);
  return _secret;
}

export function checkPassword(plain) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD no está definida");
  if (typeof plain !== "string") return false;
  return timingSafeEqualStr(plain, expected);
}

function timingSafeEqualStr(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function signSession() {
  return await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookieHeader(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function getSessionToken(event) {
  const header = event.headers && (event.headers.cookie || event.headers.Cookie);
  const cookies = parseCookieHeader(header);
  return cookies[SESSION_COOKIE] || null;
}

export async function isAuthenticated(event) {
  const token = getSessionToken(event);
  return !!(await verifySession(token));
}

export function buildSessionCookie(token, isProd) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

export function buildClearCookie(isProd) {
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

export function json(status, body, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders },
    body: JSON.stringify(body),
  };
}

export function methodNotAllowed(allowed) {
  return json(405, { error: "Método no permitido", allowed });
}

export function isProd() {
  return process.env.NODE_ENV === "production" || process.env.NETLIFY === "true";
}
