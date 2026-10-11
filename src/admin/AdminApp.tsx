import { lazy, Suspense, useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  FileText,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LoaderCircle,
  LogOut,
  Mail,
  Menu,
  Megaphone,
  MessageSquareQuote,
  Moon,
  MoreHorizontal,
  Package,
  Palette,
  PenSquare,
  ScrollText,
  ShieldCheck,
  Star,
  Sun,
  Timer,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import "./admin.css";
import { AdminAuthProvider, canOpen, useAdminAuth, type AdminFeature, type AdminRole } from "./auth";
import { isAdminApiConfigured } from "./api";
import { Badge, Banner, Field, ToastProvider, useAdminTheme, useToast } from "./ui";
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

  The shell is built for a phone first. Under 1024px the navy sidebar becomes
  a drawer, a navy bar at the top names the screen, and a bar at the foot
  holds the first few screens the person's role allows plus More, which opens
  the drawer with the rest. From 1024px the sidebar is simply there.
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

type Section =
  | "overview"
  | "leads"
  | "influencers"
  | "products"
  | "content"
  | "blog"
  | "appearance"
  | "faqs"
  | "testimonials"
  | "team"
  | "audit"
  | "recycle";

type ScreenModule = Promise<{ default: React.ComponentType }>;

const SCREEN_LOADERS: Record<Section, () => ScreenModule> = {
  overview: () => import("./pages/Overview"),
  leads: () => import("./pages/Leads"),
  influencers: () => import("./pages/Influencers"),
  products: () => import("./pages/Products"),
  content: () => import("./pages/Content"),
  blog: () => import("./pages/Blog"),
  appearance: () => import("./pages/Appearance"),
  faqs: () => import("./pages/Faqs"),
  testimonials: () => import("./pages/Testimonials"),
  team: () => import("./pages/Team"),
  audit: () => import("./pages/Audit"),
  recycle: () => import("./pages/RecycleBin"),
};

const Overview = screen(SCREEN_LOADERS.overview);
const Leads = screen(SCREEN_LOADERS.leads);
const Influencers = screen(SCREEN_LOADERS.influencers);
const Products = screen(SCREEN_LOADERS.products);
const Content = screen(SCREEN_LOADERS.content);
const Blog = screen(SCREEN_LOADERS.blog);
const Appearance = screen(SCREEN_LOADERS.appearance);
const Faqs = screen(SCREEN_LOADERS.faqs);
const Testimonials = screen(SCREEN_LOADERS.testimonials);
const Team = screen(SCREEN_LOADERS.team);
const Audit = screen(SCREEN_LOADERS.audit);
const RecycleBin = screen(SCREEN_LOADERS.recycle);

function preloadScreen(section: Section) {
  void SCREEN_LOADERS[section]().catch(() => undefined);
}

const NAV: { id: Section; label: string; icon: typeof BarChart3; group: string }[] = [
  { id: "overview", label: "Overview", icon: BarChart3, group: "Enquiries" },
  { id: "leads", label: "Enquiries", icon: ClipboardList, group: "Enquiries" },
  { id: "influencers", label: "Influencers", icon: Megaphone, group: "Enquiries" },
  { id: "products", label: "Products", icon: Package, group: "Website" },
  { id: "content", label: "Edit pages", icon: FileText, group: "Website" },
  { id: "blog", label: "Blog", icon: PenSquare, group: "Website" },
  { id: "appearance", label: "Colours", icon: Palette, group: "Website" },
  { id: "faqs", label: "Questions", icon: MessageSquareQuote, group: "Website" },
  { id: "testimonials", label: "Reviews", icon: Star, group: "Website" },
  { id: "team", label: "Administrators", icon: Users, group: "Account" },
  { id: "audit", label: "Access log", icon: ScrollText, group: "Account" },
  { id: "recycle", label: "Recycle Bin", icon: Trash2, group: "Account" },
];

const ROLE_LABEL: Record<AdminRole, string> = {
  owner: "Owner",
  marketing: "Marketing",
  sales: "Sales",
};

function firstSectionFor(role: AdminRole, features: AdminFeature[]): Section {
  return (NAV.find((item) => canOpen(role, item.id, features))?.id ?? "content") as Section;
}

/* The section is held in the hash rather than as a route, so no dashboard
   screen ever appears in a shareable path and nothing about a person's record
   can end up in a link. */
function useSection(role: AdminRole, features: AdminFeature[]) {
  const read = (): Section => {
    const raw = window.location.hash.replace("#", "") as Section;
    return NAV.some((item) => item.id === raw) && canOpen(role, raw, features) ? raw : firstSectionFor(role, features);
  };
  const [section, setSection] = useState<Section>(read);

  useEffect(() => {
    const onHash = () => setSection(read());
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => window.removeEventListener("hashchange", onHash);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [role, features]);

  const go = (next: Section) => {
    window.location.hash = next;
    setSection(next);
  };

  return { section, go };
}

/* The lockup: the client's own logo, reversed for dark surfaces, with a small
   caption saying what this is. It only ever sits on navy, so it is the same
   in both themes. */
function Brand() {
  return (
    <div className="admin-brand">
      <img
        src="/brand/medville-logo-on-dark.svg"
        alt="Medville Diabetes"
        width={107}
        height={48}
        className="admin-brand-logo"
      />
      <small>Dashboard</small>
    </div>
  );
}

/* Two letters for the avatar, taken from the sign-in address: ada.lovelace@
   gives AL, and a single word gives its first two letters. */
function initialsFor(email: string) {
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
  return (letters || "?").toUpperCase();
}

/* What shows while a screen's code is fetched. The bars echo the shape of a
   page, a title and a card of rows, so nothing jumps when the real one lands. */
function ScreenSkeleton() {
  return (
    <div className="admin-skel" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <span className="admin-skel-bar" style={{ width: "min(220px, 55%)", height: 28 }} />
      <span className="admin-skel-bar" style={{ width: "min(420px, 85%)", height: 14, marginTop: 12 }} />
      <div className="admin-card admin-skel-card" aria-hidden="true">
        {[100, 92, 96, 84, 90].map((width, index) => (
          <div key={index} className="admin-skel-row">
            <span className="admin-skel-bar" style={{ width: 40, height: 40, flex: "none", borderRadius: 8 }} />
            <span className="admin-skel-bar" style={{ width: `${width * 0.5}%`, height: 14 }} />
            <span className="admin-skel-bar admin-skel-hide" style={{ width: 72, height: 14, marginLeft: "auto" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SignIn() {
  const { signIn, pendingApproval, signedOutReason, configured } = useAdminAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  /* Caps Lock cannot be read directly. A key press reports it, so the warning
     follows the last key the person touched and clears when they leave. */
  const watchCapsLock = (event: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(event.getModifierState("CapsLock"));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
      toast("Signed in successfully.");
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
    <div className="admin-signin admin-signin-split">
      <aside className="admin-signin-brand">
        <img
          className="admin-signin-logo"
          src="/brand/medville-logo-on-dark.svg"
          alt="Medville Diabetes"
          width={98}
          height={44}
        />
        <div className="admin-signin-pitch">
          <h2 className="admin-signin-headline">Your Medville dashboard</h2>
          <p className="admin-signin-lede">
            Manage enquiries, products and site content in one secure place.
          </p>
          <ul className="admin-signin-points">
            <li>
              <span className="admin-signin-point-icon" aria-hidden="true">
                <UserRound size={18} />
              </span>
              <span>Every person has their own login. Accounts are never shared.</span>
            </li>
            <li>
              <span className="admin-signin-point-icon" aria-hidden="true">
                <KeyRound size={18} />
              </span>
              <span>Your role decides which screens you can open.</span>
            </li>
            <li>
              <span className="admin-signin-point-icon" aria-hidden="true">
                <Timer size={18} />
              </span>
              <span>You are signed out after 20 minutes of inactivity and when the tab closes.</span>
            </li>
          </ul>
        </div>
      </aside>

      <main className="admin-signin-main">
        <div className="admin-signin-card">
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

          <h1 className="admin-signin-title">Sign in</h1>
          <p className="admin-signin-sub">Use the address and password you were invited with.</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Email address" htmlFor="admin-email">
              <div className="admin-signin-control">
                <Mail className="admin-signin-lead" size={18} aria-hidden="true" />
                <input
                  id="admin-email"
                  className="admin-input admin-signin-input"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </Field>
            <Field label="Password" htmlFor="admin-password">
              <div className="admin-signin-control">
                <Lock className="admin-signin-lead" size={18} aria-hidden="true" />
                <input
                  id="admin-password"
                  className="admin-input admin-signin-input admin-signin-input-end"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={watchCapsLock}
                  onKeyUp={watchCapsLock}
                  onBlur={() => setCapsLock(false)}
                />
                <button
                  type="button"
                  className="admin-signin-reveal"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((shown) => !shown)}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              {capsLock && (
                <p className="admin-signin-caps" role="status">
                  <Lock size={14} aria-hidden="true" />
                  Caps Lock is on.
                </p>
              )}
            </Field>

            {error && <Banner tone="danger">{error}</Banner>}

            <button
              type="submit"
              className="admin-btn admin-btn-primary admin-signin-submit"
              disabled={busy || !configured}
            >
              {busy && <LoaderCircle className="admin-signin-spin" size={18} aria-hidden="true" />}
              {busy ? "Signing in" : "Sign in"}
            </button>
          </form>

          <p className="admin-signin-notice">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>
              This dashboard holds patient information. Do not share your login, and sign
              out when you leave the screen.
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}

function Shell() {
  const { session, signOutNow, idleWarning, keepAwake } = useAdminAuth();
  const toast = useToast();
  const { theme, toggle } = useAdminTheme();
  const [navOpen, setNavOpen] = useState(false);
  const role = session!.role;
  const features = session!.features;
  const { section, go } = useSection(role, features);

  usePageMeta("Dashboard | Medville Diabetes");

  useEffect(() => {
    setNavOpen(false);
  }, [section]);

  useEffect(() => {
    sessionStorage.removeItem(RELOADED_KEY);
  }, []);

  /* Escape closes the phone menu, the way it closes every other panel. */
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setNavOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const visible = NAV.filter((item) => canOpen(role, item.id, features));
  const groups = [...new Set(visible.map((item) => item.group))];
  const current = NAV.find((item) => item.id === section);

  /* Load the small page chunks after the signed-in shell is visible. This
     keeps login lean while making the first switch to every allowed screen
     immediate. Hover and keyboard focus below start the same preload sooner. */
  useEffect(() => {
    const preload = () => {
      void Promise.allSettled(
        NAV.filter((item) => canOpen(role, item.id, features)).map((item) => SCREEN_LOADERS[item.id]()),
      );
    };
    if (typeof window.requestIdleCallback === "function") {
      const idle = window.requestIdleCallback(preload, { timeout: 1500 });
      return () => window.cancelIdleCallback(idle);
    }
    const timer = globalThis.setTimeout(preload, 1000);
    return () => globalThis.clearTimeout(timer);
  }, [role, features]);

  /* The phone footer holds the first four screens this role can open; the
     rest sit behind More, which is also where the theme and sign-out live. */
  const tabs = visible.slice(0, 4);
  const inTabs = tabs.some((item) => item.id === section);

  const themeLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  const nav = (
    <>
      <button
        type="button"
        className="admin-icon-btn admin-side-close"
        aria-label="Close the menu"
        onClick={() => setNavOpen(false)}
      >
        <X size={20} />
      </button>

      <Brand />

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
                  onPointerEnter={() => preloadScreen(item.id)}
                  onFocus={() => preloadScreen(item.id)}
                  onClick={() => go(item.id)}
                >
                  <Icon size={17} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
        </div>
      ))}

      <div className="admin-nav-foot">
        <div className="admin-user">
          <span className="admin-avatar" aria-hidden="true">
            {initialsFor(session!.email)}
          </span>
          <span className="admin-user-meta">
            <span className="admin-user-email" title={session!.email}>
              {session!.email}
            </span>
            <Badge tone="new">{ROLE_LABEL[role]}</Badge>
          </span>
        </div>
        <div className="admin-nav-actions">
          <button type="button" className="admin-nav-link admin-nav-link-sm" onClick={toggle} aria-label={themeLabel}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <button
            type="button"
            className="admin-nav-link admin-nav-link-sm"
            onClick={() => void signOutNow("You signed out.").then(() => toast("Signed out successfully.")).catch(() => toast("Sign out failed. Please try again.", "danger"))}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="admin" data-admin-theme={theme}>
      <div className="admin-topbar">
        <img
          src="/brand/medville-logo-on-dark.svg"
          alt="Medville Diabetes"
          width={71}
          height={32}
          className="admin-topbar-logo"
        />
        <p className="admin-topbar-title m-0">{current?.label ?? "Dashboard"}</p>
        <button type="button" className="admin-icon-btn" onClick={toggle} aria-label={themeLabel}>
          {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <button
          type="button"
          className="admin-icon-btn"
          aria-expanded={navOpen}
          aria-label={navOpen ? "Close the menu" : "Open the menu"}
          onClick={() => setNavOpen((open) => !open)}
        >
          {navOpen ? <X size={20} /> : <Menu size={20} />}
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
        <aside
          className="admin-side"
          data-open={navOpen}
          {...(navOpen ? { role: "dialog", "aria-modal": true, "aria-label": "Menu" } : {})}
        >
          {nav}
        </aside>

        <main className="admin-main">
          {/*
            The website half of the dashboard talks to Firestore directly. The
            enquiry half talks to the adminApi function, and its address is a
            build-time value, so a build made before that function was deployed
            has nowhere to send anything. Saying so here is the difference
            between "this screen is broken" and "this half is not switched on
            yet"; without it, Enquiries and the access log fail with an error
            that explains nothing.
          */}
          {!isAdminApiConfigured() && (section === "overview" || section === "leads" || section === "influencers" || section === "audit" || section === "recycle") && (
            <div className="mb-4">
              <Banner tone="warn">
                Online intake is awaiting activation. Enquiries and the access log
                will become available after the backend is connected. Website
                content can still be managed from the menu.
              </Banner>
            </div>
          )}

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

          <Suspense fallback={<ScreenSkeleton />}>
            {section === "overview" && <Overview />}
            {section === "leads" && <Leads />}
            {section === "influencers" && <Influencers />}
            {section === "products" && <Products />}
            {section === "content" && <Content />}
            {section === "blog" && <Blog />}
            {section === "appearance" && <Appearance />}
            {section === "faqs" && <Faqs />}
            {section === "testimonials" && <Testimonials />}
            {section === "team" && <Team />}
            {section === "audit" && <Audit />}
            {section === "recycle" && <RecycleBin />}
          </Suspense>
        </main>
      </div>

      <nav
        className="admin-tabbar"
        aria-label="Sections"
        style={{ "--tabs": tabs.length + 1 } as React.CSSProperties}
      >
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className="admin-tab"
              aria-current={section === item.id ? "page" : undefined}
              onPointerEnter={() => preloadScreen(item.id)}
              onFocus={() => preloadScreen(item.id)}
              onClick={() => go(item.id)}
            >
              <span className="admin-tab-icon">
                <Icon size={21} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span className="admin-tab-label">{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="admin-tab"
          aria-expanded={navOpen}
          aria-current={!inTabs && !navOpen ? "page" : undefined}
          onClick={() => setNavOpen((open) => !open)}
        >
          <span className="admin-tab-icon">
            <MoreHorizontal size={21} strokeWidth={1.9} aria-hidden="true" />
          </span>
          <span className="admin-tab-label">More</span>
        </button>
      </nav>
    </div>
  );
}

function Gate() {
  const { ready, session } = useAdminAuth();
  const { theme } = useAdminTheme();

  if (!ready) {
    return (
      <div className="admin" data-admin-theme={theme}>
        <div className="admin-boot" role="status" aria-live="polite">
          <img
            src="/brand/medville-logo-on-dark.svg"
            alt="Medville Diabetes"
            width={134}
            height={60}
            className="admin-boot-logo"
          />
          <span className="admin-spin" aria-hidden="true" />
          <p className="admin-boot-text">Checking your session</p>
        </div>
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

  /*
    A missing Firebase configuration is handled inside AdminAuthProvider, which
    renders the shell and explains what is missing rather than showing a blank
    screen or a sign-in form that could never succeed.
  */

  return (
    <AdminAuthProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </AdminAuthProvider>
  );
}
