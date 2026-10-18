import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  beginGoogleLogin,
  completeGoogleLogin,
  currentUser,
  emailAllowed,
  endSession,
  googleEnabled,
  login,
  publicUser,
  requireAdmin,
  startSession,
} from "../auth";
import { config } from "../config";
import { collection, newId } from "../db/store";
import { logUsage } from "./usage";

export const authRouter = Router();

/** What the login page should offer. */
authRouter.get("/config", (_req, res) => {
  res.json({ google: googleEnabled, password: config.AUTH_PASSWORD_LOGIN, domains: config.ALLOWED_EMAIL_DOMAINS.split(",").map((d) => d.trim()) });
});

/** Step 1: send the browser to Google. */
authRouter.get("/google", (_req, res) => {
  if (!googleEnabled) return res.status(404).json({ error: "Google sign-in is not configured" });
  res.redirect(beginGoogleLogin(res));
});

/** Step 2: Google sends the browser back here with a code. */
authRouter.get("/google/callback", async (req, res) => {
  if (!googleEnabled) return res.status(404).json({ error: "Google sign-in is not configured" });
  const q = z.object({ code: z.string().optional(), state: z.string().optional(), error: z.string().optional() }).safeParse(req.query);
  if (!q.success || q.data.error || !q.data.code || !q.data.state) return res.redirect("/?auth_error=cancelled");
  const result = await completeGoogleLogin(req, res, q.data.code, q.data.state);
  if (typeof result === "string") return res.redirect(`/?auth_error=${result}`);
  startSession(res, result);
  logUsage({ userId: result.id, userEmail: result.email, action: "login" });
  res.redirect("/");
});

authRouter.post("/login", (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Email and password are required" });
  const user = login(body.data.email, body.data.password);
  if (!user) return res.status(401).json({ error: "Wrong email or password" });
  startSession(res, user);
  logUsage({ userId: user.id, userEmail: user.email, action: "login" });
  res.json({ user: publicUser(user) });
});

authRouter.post("/logout", (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  const user = currentUser(req);
  res.json({ user: user ? publicUser(user) : null });
});

/** Admin: list users and add one. */
authRouter.get("/users", requireAdmin, (_req, res) => {
  res.json({ users: collection("users").all().map((u) => ({ ...publicUser(u), createdAt: u.createdAt, lastLoginAt: u.lastLoginAt, hasPassword: Boolean(u.passwordHash) })) });
});

/**
 * Add an account. With a password it can use the email login; without one it
 * is a Google-only account, pre-registered so the person gets the chosen role
 * the first time they sign in with Google.
 */
authRouter.post("/users", requireAdmin, (req, res) => {
  const body = z
    .object({
      email: z.string().email(),
      name: z.string().min(1),
      password: z.string().min(8).optional().or(z.literal("")),
      role: z.enum(["admin", "user"]),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Email, name and role are required; a password must be 8+ characters" });
  const email = body.data.email.toLowerCase();
  if (!emailAllowed(email)) return res.status(400).json({ error: "Only TAM email addresses can have an account" });
  if (collection("users").find((u) => u.email === email).length) return res.status(409).json({ error: "That email already has an account" });
  const password = body.data.password || "";
  const user = collection("users").insert({
    id: newId("usr"),
    email,
    name: body.data.name,
    role: body.data.role,
    passwordHash: password ? bcrypt.hashSync(password, 10) : "",
    provider: password ? "password" : "google",
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ user: publicUser(user) });
});

/** Change someone's role. Admins cannot demote themselves, so there is always one left. */
authRouter.patch("/users/:id", requireAdmin, (req, res) => {
  const body = z.object({ role: z.enum(["admin", "user"]) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Role must be admin or user" });
  if (req.params.id === req.user.id) return res.status(400).json({ error: "You cannot change your own role" });
  const user = collection("users").update(req.params.id, { role: body.data.role });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

authRouter.delete("/users/:id", requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: "You cannot remove your own account" });
  res.json({ ok: collection("users").remove(req.params.id) });
});
