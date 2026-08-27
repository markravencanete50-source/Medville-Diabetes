import { lazy, Suspense, useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  LogOut,
  Menu,
  MessageSquareQuote,
  Moon,
  Package,
  ScrollText,
  ShieldCheck,
  Sun,
  Users,
  X,
} from "lucide-react";
import "./admin.css";
import { AdminAuthProvider, canOpen, isAdminConfigured, useAdminAuth, type AdminRole } from "./auth";
import { Banner, Card, Field, ToastProvider, useAdminTheme } from "./ui";
import { usePageMeta } from "../lib/usePageMeta";

/*
  The administration dashboard.

  It lives at /admin inside the same single-page app as the website, but every
  screen below is loaded on demand, so a marketing visitor never downloads any
  of it. The whole dashboard, including the Firebase SDK, is one lazy chunk.

  The route is not a secret and is not treated as one. Access is decided by an
  Identity Platform token and a role claim, checked again on the server for
  anything touching Protected Health Information. Hiding the URL would add no
  security and would only make the client's own dashboard hard to find.
*/

/*
  Each screen is its own chunk, fetched the first time it is opened.

  The wrapper matters on a dashboard someone leaves open all day. When a new
  version is deployed, the file names change, and the next screen they open
  asks the server for a chunk that no longer exists. Left alone that is a
  blank page. One reload picks up the new version, and the flag makes sure a
  genuine network failure cannot put the page into a reload loop.
*/
const RELOADED_KEY = "medville:admin-reloaded";

function screen(load: () => Promise<{ default: React.ComponentType }>) {
  return lazy(() =>
    load().catch((problem) => {
      const alreadyTried = sessionStorage.getItem(RELOADED_KEY) === "1";
      if (!alreadyTried) {
        sessionStorage.setItem(RELOADED_KEY, "1");
        window.location.reload();
      }
      throw problem;
    }),
  );
}

const Overview = screen(() => import("./pages/Overview"));
const Leads = screen(() => import("./pages/Leads"));
const Products = screen(() => import("./pages/Products"));
const Content = screen(() => import("./pages/Content"));
const Appearance = screen(() => import("./pages/Appearance"));
const Faqs = screen(() => import("./pages/Faqs"));
const Testimonials = screen(() => import("./pages/Testimonials"));
const Team = screen(() => import("./pages/Team"));
const Audit = screen(() => import("./pages/Audit"));

type Section =
  | "overview"
  | "leads"
  | "products"
  | "content"
  | "appearance"
  | "faqs"
  | "testimonials"
  | "team"
  | "audit";

const NAV: { id: Section; label: string; icon: typeof BarChart3; group: string }[] = [
  { id: "overview", label: "Overview", icon: BarChart3, group: "Enquiries" },
  { id: "leads", label: "Enquiries", icon: ClipboardList, group: "Enquiries" },
  { id: "products", label: "Products", icon: Package, group: "Website" },
  { id: "content", label: "Page text", icon: FileText, group: "Website" },
  { id: "appearance", label: "Colours", icon: ImageIcon, group: "Website" },
  { id: "faqs", label: "Questions", icon: MessageSquareQuote, group: "Website" },
  { id: "testimonials", label: "Reviews", icon: MessageSquareQuote, group: "Website" },
  { id: "team", label: "Administrators", icon: Users, group: "Account" },
  { id: "audit", label: "Access log", icon: ScrollText, group: "Account" },
];

function firstSectionFor(role: AdminRole): Section {
  return (NAV.find((item) => canOpen(role, item.id))?.id ?? "content") as Section;
}

/* The section is held in the hash rather than as a route, so no dashboard
   screen ever appears in a shareable path and nothing about a person's record
   can end up in a link. */
function useSection(role: AdminRole) {
  const read = (): Section => {
    const raw = window.location.hash.replace("#", "") as Section;
    return NAV.some((item) => item.id === raw) && canOpen(role, raw) ? raw : firstSectionFor(role);
  };
  const [section, setSection] = useState<Section>(read);

  useEffect(() => {
    const onHash = () => setSection(read());
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => window.removeEventListener("hashchange", onHash);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [role]);

  const go = (next: Section) => {
    window.location.hash = next;
    setSection(next);
  };

  return { section, go };
}

function SignIn() {
  const { signIn, pendingApproval, signedOutReason, configured } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (problem) {
      /*
        One message for every wrong credential. Saying which half was wrong
        tells an attacker which addresses are real.

        A project that is not finished being set up is a different thing
        entirely, and reporting it as a bad password would send the client
        hunting for a typo that does not exist.
      */
      const code = (problem as { code?: string })?.code ?? "";
      setError(
        code === "auth/operation-not-allowed" || code === "auth/configuration-not-found"
          ? "Sign-in is not switched on for this project yet. Enable the email and password provider in Identity Platform. See ADMIN-SETUP.md."
          : "That email address and password did not match.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-[400px]">
        <div className="admin-brand" style={{ padding: "0 0 14px" }}>
          <ShieldCheck size={20} style={{ color: "var(--a-brand)" }} />
          <span>
            Medville
            <small>Dashboard</small>
          </span>
        </div>

        {!configured && (
          <div className="mb-4">
            <Banner tone="warn">
              Sign-in is not connected yet. Identity Platform has to be enabled on the
              Google Cloud project and the site environment filled in. See
              ADMIN-SETUP.md.
            </Banner>
          </div>
        )}

        {signedOutReason && (
          <div className="mb-4">
            <Banner tone="warn">{signedOutReason}</Banner>
          </div>
        )}

        {pendingApproval && (
          <div className="mb-4">
            <Banner tone="warn">
              Your account exists but has not been given access yet. Ask the account
              owner to grant you a role.
            </Banner>
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <Field label="Email address" htmlFor="admin-email">
            <input
              id="admin-email"
              className="admin-input"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="admin-password">
            <input
              id="admin-password"
              className="admin-input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          {error && <Banner tone="danger">{error}</Banner>}

          <button type="submit" className="admin-btn admin-btn-primary" disabled={busy || !configured}>
            {busy ? "Signing in" : "Sign in"}
          </button>
        </form>

        <p className="admin-help mt-4">
          This dashboard holds patient information. Do not share your login, and sign
          out when you leave the screen.
        </p>
      </Card>
    </div>
  );
}

function Shell() {
  const { session, signOutNow, idleWarning, keepAwake } = useAdminAuth();
  const { theme, toggle } = useAdminTheme();
  const [navOpen, setNavOpen] = useState(false);
  const role = session!.role;
  const { section, go } = useSection(role);

  usePageMeta("Dashboard | Medville Diabetes");

  useEffect(() => {
    setNavOpen(false);
  }, [section]);

  useEffect(() => {
    sessionStorage.removeItem(RELOADED_KEY);
  }, []);

  const visible = NAV.filter((item) => canOpen(role, item.id));
  const groups = [...new Set(visible.map((item) => item.group))];

  const nav = (
    <>
      <div className="admin-brand">
        <ShieldCheck size={20} style={{ color: "var(--a-brand)" }} />
        <span>
          Medville
          <small>Dashboard</small>
        </span>
      </div>

      {groups.map((group) => (
        <div key={group}>
          <p className="admin-nav-group">{group}</p>
          {visible
            .filter((item) => item.group === group)
            .map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="admin-nav-link w-full"
                  aria-current={section === item.id ? "page" : undefined}
                  onClick={() => go(item.id)}
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
        </div>
      ))}

      <div className="mt-auto pt-5">
        <p className="admin-help mb-2 truncate" title={session!.email}>
          {session!.email}
          <br />
          <span style={{ textTransform: "capitalize" }}>{role}</span>
        </p>
        <button type="button" className="admin-nav-link w-full" onClick={toggle}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          type="button"
          className="admin-nav-link w-full"
          onClick={() => void signOutNow("You signed out.")}
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="admin" data-admin-theme={theme}>
      <div className="admin-topbar">
        <button
          type="button"
          className="admin-btn admin-btn-quiet"
          style={{ minHeight: 38, padding: "0 11px" }}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((open) => !open)}
        >
          {navOpen ? <X size={18} /> : <Menu size={18} />}
          Menu
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-quiet"
          style={{ minHeight: 38, padding: "0 11px" }}
          onClick={toggle}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>

      <div className="admin-shell">
        {navOpen && (
          <button
            type="button"
            className="admin-scrim"
            aria-label="Close the menu"
            onClick={() => setNavOpen(false)}
          />
        )}
        <aside className="admin-side" data-open={navOpen}>
          {nav}
        </aside>

        <main className="admin-main">
          {idleWarning && (
            <div className="mb-4">
              <Banner tone="warn">
                You will be signed out shortly because this screen has been idle.{" "}
                <button
                  type="button"
                  className="font-semibold underline underline-offset-2"
                  onClick={keepAwake}
                >
                  Stay signed in
                </button>
              </Banner>
            </div>
          )}

          <Suspense
            fallback={
              <p className="py-16 text-center text-[14px]" style={{ color: "var(--a-text-faint)" }}>
                Loading
              </p>
            }
          >
            {section === "overview" && <Overview />}
            {section === "leads" && <Leads />}
            {section === "products" && <Products />}
            {section === "content" && <Content />}
            {section === "appearance" && <Appearance />}
            {section === "faqs" && <Faqs />}
            {section === "testimonials" && <Testimonials />}
            {section === "team" && <Team />}
            {section === "audit" && <Audit />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function Gate() {
  const { ready, session } = useAdminAuth();
  const { theme } = useAdminTheme();

  if (!ready) {
    return (
      <div className="admin" data-admin-theme={theme}>
        <p className="py-24 text-center text-[14px]" style={{ color: "var(--a-text-faint)" }}>
          Checking your session
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="admin" data-admin-theme={theme}>
        <SignIn />
      </div>
    );
  }

  return <Shell />;
}

export default function AdminApp() {
  /* The dashboard must never be indexed. The hosting headers say so for the
     path, and this says so for the document itself. */
  useEffect(() => {
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex, nofollow";
    document.head.appendChild(tag);
    return () => {
      tag.remove();
    };
  }, []);

  if (!isAdminConfigured()) {
    /* Still render the shell so the client can see the dashboard exists and
       read what is missing, rather than meeting a blank screen. */
  }

  return (
    <AdminAuthProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </AdminAuthProvider>
  );
}
