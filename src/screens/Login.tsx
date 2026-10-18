/**
 * Sign in. The dashboard is for TAM staff only, so nothing renders until the
 * server has confirmed who is asking.
 */
import { useEffect, useState } from "react";
import { LockKeyhole, Loader2 } from "lucide-react";
import { TamLogo } from "../components/TamLogo";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button, Card } from "../components/ui";
import { auth } from "../lib/api";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";

export function Login() {
  const { t, lang } = useT();
  const setUser = useStore((s) => s.setUser);
  const setLanguage = useStore((s) => s.setLanguage);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [methods, setMethods] = useState<{ google: boolean; password: boolean; domains: string[] } | null>(null);

  useEffect(() => {
    auth.config().then(setMethods).catch(() => setMethods({ google: false, password: true, domains: [] }));
    // Google sends the browser back to "/" with a reason when sign-in failed.
    const code = new URLSearchParams(window.location.search).get("auth_error");
    if (code) {
      const key = ({ domain: "googleErrDomain", state: "googleErrState", unverified: "googleErrUnverified", exchange: "googleErrExchange", cancelled: "googleErrCancelled" } as const)[code] ?? "loginFailed";
      setError(t(key));
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { user } = await auth.login(email.trim(), password);
      setUser(user);
    } catch (err) {
      setError((err as Error).message || t("loginFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-ink">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-6 flex items-center justify-between">
          <TamLogo />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLanguage(lang === "ar" ? "en" : "ar")}
              className="rounded-lg px-2 py-1.5 text-sm text-ink-2 hover:bg-hover hover:text-ink"
            >
              {t("langToggle")}
            </button>
            <ThemeToggle />
          </div>
        </div>
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-active text-brand">
              <LockKeyhole size={18} />
            </span>
            <div>
              <h1 className="text-lg font-semibold">{t("loginTitle")}</h1>
              <p className="text-sm text-ink-2">{t("loginSub")}</p>
            </div>
          </div>
          {methods?.google && (
            <div className="mb-5">
              <a
                href="/api/auth/google"
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-hover"
              >
                <GoogleMark />
                {t("googleSignIn")}
              </a>
              <p className="mt-2 text-center text-[11px] text-ink-muted">
                {t("googleDomainNote", { domain: methods.domains.join(", ") })}
              </p>
              {methods.password && (
                <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-muted">
                  <span className="h-px flex-1 bg-line" />
                  {t("loginOr")}
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}
            </div>
          )}
          {error && !methods?.password && (
            <p className="rounded-control border border-bad/30 bg-bad-bg px-3 py-2 text-sm text-bad">{error}</p>
          )}
          {(methods?.password ?? true) && (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-xs text-ink-2">{t("loginEmail")}</span>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@tamhub.com"
                className="mt-0.5 block w-full rounded-lg border border-line bg-bg/50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
                dir="ltr"
              />
            </label>
            <label className="block">
              <span className="text-xs text-ink-2">{t("loginPassword")}</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-0.5 block w-full rounded-lg border border-line bg-bg/50 px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                dir="ltr"
              />
            </label>
            {error && (
              <p className="rounded-control border border-bad/30 bg-bad-bg px-3 py-2 text-sm text-bad">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              {t("loginButton")}
            </Button>
          </form>
          )}
        </Card>
        <p className="mt-4 text-center text-xs text-ink-muted">{t("loginFooter")}</p>
      </div>
    </div>
  );
}

/** The four-colour G, inline so no asset is needed. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
