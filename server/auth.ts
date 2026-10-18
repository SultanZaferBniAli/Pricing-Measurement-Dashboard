/**
 * Sessions and users for the developer version.
 *
 * Email + password, bcrypt hashes, a signed random session id in an httpOnly
 * cookie, sessions held in memory. Accounts are seeded from SEED_USERS and can
 * be added by an admin. Only emails on ALLOWED_EMAIL_DOMAINS are accepted, so
 * nobody outside TAM can be given an account by mistake.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config";
import { collection, newId, type User } from "./db/store";

const COOKIE = "tam_session";
const sessions = new Map<string, { userId: string; expires: number }>();
const TTL_MS = 1000 * 60 * 60 * 12;

export function seedUsers() {
  const users = collection("users");
  for (const entry of config.SEED_USERS.split(",")) {
    const [email, password, role] = entry.split(":").map((s) => s?.trim());
    if (!email || !password) continue;
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase()).length) continue;
    users.insert({
      id: newId("usr"),
      email: email.toLowerCase(),
      name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      role: role === "admin" ? "admin" : "user",
      passwordHash: bcrypt.hashSync(password, 10),
      createdAt: new Date().toISOString(),
    });
  }
}

export function emailAllowed(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return Boolean(domain) && config.ALLOWED_EMAIL_DOMAINS.split(",").map((d) => d.trim().toLowerCase()).includes(domain);
}

function sign(id: string): string {
  const mac = crypto.createHmac("sha256", config.SESSION_SECRET).update(id).digest("base64url");
  return `${id}.${mac}`;
}
function verify(token: string | undefined): string | null {
  if (!token) return null;
  const [id, mac] = token.split(".");
  if (!id || !mac) return null;
  const expected = crypto.createHmac("sha256", config.SESSION_SECRET).update(id).digest("base64url");
  if (expected.length !== mac.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(mac))) return null;
  return id;
}

export function publicUser(u: User) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, picture: u.picture ?? null, provider: u.provider ?? "password" };
}

export function login(email: string, password: string): User | null {
  if (!config.AUTH_PASSWORD_LOGIN) return null;
  const user = collection("users").find((u) => u.email === email.toLowerCase())[0];
  if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) return null;
  collection("users").update(user.id, { lastLoginAt: new Date().toISOString() });
  return user;
}

export function startSession(res: Response, user: User) {
  const id = crypto.randomBytes(24).toString("base64url");
  sessions.set(id, { userId: user.id, expires: Date.now() + TTL_MS });
  res.cookie(COOKIE, sign(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: config.NODE_ENV === "production",
    maxAge: TTL_MS,
    path: "/",
  });
}

export function endSession(req: Request, res: Response) {
  const id = verify(req.cookies?.[COOKIE]);
  if (id) sessions.delete(id);
  res.clearCookie(COOKIE, { path: "/" });
}

export function currentUser(req: Request): User | null {
  const id = verify(req.cookies?.[COOKIE]);
  if (!id) return null;
  const s = sessions.get(id);
  if (!s || s.expires < Date.now()) {
    if (s) sessions.delete(id);
    return null;
  }
  return collection("users").get(s.userId) ?? null;
}

declare module "express-serve-static-core" {
  interface Request {
    user: User;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: "Not signed in" });
  req.user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: "Not signed in" });
  if (user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  req.user = user;
  next();
}

// ---------------------------------------------------------------------------
// Google sign-in (OpenID Connect)
//
// The browser is sent to Google, Google sends it back to /api/auth/google/
// callback with a code, the server swaps the code for an ID token, verifies the
// token's signature and audience, checks the Workspace domain, then opens the
// same session cookie the password login uses. The secret never leaves the
// server and the browser never sees a token.
// ---------------------------------------------------------------------------

interface GoogleClientConfig {
  clientId: string;
  clientSecret: string;
}

function loadGoogleConfig(): GoogleClientConfig | null {
  if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
    return { clientId: config.GOOGLE_CLIENT_ID, clientSecret: config.GOOGLE_CLIENT_SECRET };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(path.resolve(config.GOOGLE_CLIENT_FILE), "utf8")) as Record<
      string,
      { client_id?: string; client_secret?: string }
    >;
    const web = raw.web ?? raw.installed ?? Object.values(raw)[0];
    if (web?.client_id && web?.client_secret) return { clientId: web.client_id, clientSecret: web.client_secret };
  } catch {
    /* no file: Google sign-in stays off */
  }
  return null;
}

const google = loadGoogleConfig();
export const googleEnabled = Boolean(google);

function oauthClient(): OAuth2Client {
  if (!google) throw new Error("Google sign-in is not configured");
  return new OAuth2Client({ clientId: google.clientId, clientSecret: google.clientSecret, redirectUri: config.GOOGLE_REDIRECT_URI });
}

const STATE_COOKIE = "tam_oauth_state";

/** Build the Google authorisation URL and remember the state in a short-lived cookie. */
export function beginGoogleLogin(res: Response): string {
  const state = crypto.randomBytes(16).toString("base64url");
  res.cookie(STATE_COOKIE, sign(state), { httpOnly: true, sameSite: "lax", secure: config.NODE_ENV === "production", maxAge: 10 * 60 * 1000, path: "/" });
  const domains = config.ALLOWED_EMAIL_DOMAINS.split(",").map((d) => d.trim());
  return oauthClient().generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    state,
    prompt: "select_account",
    // A single Workspace domain can be pre-selected on Google's side; the
    // server still checks the domain on the token, so this is UX, not security.
    ...(domains.length === 1 ? { hd: domains[0] } : {}),
  });
}

export type GoogleLoginError = "state" | "domain" | "unverified" | "exchange";

/** Finish the login: verify state and token, find or create the user. */
export async function completeGoogleLogin(req: Request, res: Response, code: string, state: string): Promise<User | GoogleLoginError> {
  const expected = verify(req.cookies?.[STATE_COOKIE]);
  res.clearCookie(STATE_COOKIE, { path: "/" });
  if (!expected || expected !== state) return "state";

  const client = oauthClient();
  let idToken: string | undefined;
  try {
    const { tokens } = await client.getToken(code);
    idToken = tokens.id_token ?? undefined;
  } catch {
    return "exchange";
  }
  if (!idToken) return "exchange";

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: google!.clientId });
    payload = ticket.getPayload();
  } catch {
    return "exchange";
  }
  if (!payload?.email) return "exchange";
  if (!payload.email_verified) return "unverified";
  const email = payload.email.toLowerCase();
  // Both the hosted-domain claim and the address itself must be TAM's.
  if (!emailAllowed(email) || (payload.hd && !emailAllowed(`x@${payload.hd}`))) return "domain";

  const users = collection("users");
  const admins = config.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const now = new Date().toISOString();
  const existing = users.find((u) => u.email === email)[0];
  const patch: Partial<User> = {
    name: payload.name || existing?.name || email.split("@")[0],
    picture: payload.picture ?? existing?.picture,
    googleSub: payload.sub,
    provider: "google",
    lastLoginAt: now,
    role: existing?.role === "admin" || admins.includes(email) ? "admin" : existing?.role ?? "user",
  };
  if (existing) return users.update(existing.id, patch) ?? existing;
  return users.insert({
    id: newId("usr"),
    email,
    name: patch.name!,
    role: patch.role!,
    passwordHash: "",
    googleSub: payload.sub,
    picture: payload.picture,
    provider: "google",
    createdAt: now,
    lastLoginAt: now,
  });
}
