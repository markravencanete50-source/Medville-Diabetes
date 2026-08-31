import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserSessionPersistence,
  getAuth,
  onIdTokenChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig } from "../lib/firebaseConfig";

/*
  Administrator authentication.

  The code here targets Identity Platform. Identity Platform is the upgraded
  form of Firebase Authentication and speaks the same client SDK, so the
  project is switched over in the Google Cloud console and nothing in this
  file changes. Section 3.3 of the agreement names Identity Platform, and
  plain Firebase Authentication is not on Google's BAA covered list, so that
  console upgrade is a launch requirement, not a preference.

  Three safeguards from Section 3.4(b) live here:

  - Individual logins. There is no shared account and no anonymous path in.
  - Role-based access. The role is an Identity Platform custom claim, set only
    by the adminApi function, so it cannot be granted by anything the browser
    can reach.
  - Automatic session timeout. Sessions are held in session storage rather
    than local storage, so closing the tab ends them, and an idle session is
    signed out after IDLE_LIMIT with a warning first.
*/

const IDLE_LIMIT_MS = 20 * 60 * 1000;
const IDLE_WARNING_MS = 2 * 60 * 1000;

export type AdminRole = "owner" | "editor" | "agent";

export interface AdminSession {
  user: User;
  email: string;
  role: AdminRole;
}

interface AuthState {
  ready: boolean;
  session: AdminSession | null;
  /* Signed in, but with no role granted yet. */
  pendingApproval: boolean;
  configured: boolean;
  idleWarning: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOutNow: (reason?: string) => Promise<void>;
  changePassword: (next: string) => Promise<void>;
  getToken: () => Promise<string | null>;
  keepAwake: () => void;
  signedOutReason: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function isAdminConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

function ensureApp() {
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

export function adminAuth() {
  if (!authInstance) authInstance = getAuth(ensureApp());
  return authInstance;
}

export function adminDb() {
  if (!dbInstance) dbInstance = getFirestore(ensureApp());
  return dbInstance;
}

export function adminStorage() {
  if (!storageInstance) {
    storageInstance = getStorage(ensureApp());
    /*
      A project on the free tier has no Cloud Storage bucket, because Firebase
      only creates the default one on the Blaze plan. Uploading to a bucket
      that does not exist fails in a way the SDK treats as retryable, so with
      the stock two minute window the button sat on "Saving" for two minutes
      before saying anything. Fifteen seconds is far longer than a real 5 MB
      upload needs and short enough that a missing bucket is reported while
      the person is still looking at the screen.
    */
    storageInstance.maxUploadRetryTime = 15_000;
    storageInstance.maxOperationRetryTime = 15_000;
  }
  return storageInstance;
}

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isAdminConfigured();
  const [ready, setReady] = useState(!configured);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);
  const [signedOutReason, setSignedOutReason] = useState("");
  const lastActivity = useRef(Date.now());

  const signOutNow = useCallback(
    async (reason = "") => {
      setSignedOutReason(reason);
      setIdleWarning(false);
      if (configured) await signOut(adminAuth()).catch(() => undefined);
      setSession(null);
      setPendingApproval(false);
    },
    [configured],
  );

  /* Read the role from the token rather than from a document, so a tampered
     Firestore record can never grant access. */
  useEffect(() => {
    if (!configured) return;
    const auth = adminAuth();

    setPersistence(auth, browserSessionPersistence).catch(() => undefined);

    return onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setSession(null);
        setPendingApproval(false);
        setReady(true);
        return;
      }
      try {
        const token = await user.getIdTokenResult(true);
        const role = token.claims.role as AdminRole | undefined;
        if (role === "owner" || role === "editor" || role === "agent") {
          setSession({ user, email: user.email ?? "", role });
          setPendingApproval(false);
          lastActivity.current = Date.now();
        } else {
          setSession(null);
          setPendingApproval(true);
        }
      } catch {
        setSession(null);
        setPendingApproval(false);
      }
      setReady(true);
    });
  }, [configured]);

  /* The idle timer. It watches real input rather than a bare interval, so a
     dashboard left open on a shared desk closes itself. */
  useEffect(() => {
    if (!session) return;

    const markActive = () => {
      lastActivity.current = Date.now();
      setIdleWarning(false);
    };
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActive, { passive: true }));

    const tick = window.setInterval(() => {
      const idleFor = Date.now() - lastActivity.current;
      if (idleFor >= IDLE_LIMIT_MS) {
        void signOutNow("You were signed out because the dashboard was idle.");
      } else if (idleFor >= IDLE_LIMIT_MS - IDLE_WARNING_MS) {
        setIdleWarning(true);
      }
    }, 15000);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActive));
      window.clearInterval(tick);
    };
  }, [session, signOutNow]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      pendingApproval,
      configured,
      idleWarning,
      signedOutReason,
      keepAwake: () => {
        lastActivity.current = Date.now();
        setIdleWarning(false);
      },
      signIn: async (email, password) => {
        setSignedOutReason("");
        await signInWithEmailAndPassword(adminAuth(), email.trim(), password);
      },
      signOutNow,
      changePassword: async (next) => {
        const user = adminAuth().currentUser;
        if (!user) throw new Error("Please sign in again.");
        await updatePassword(user, next);
      },
      getToken: async () => {
        const user = adminAuth().currentUser;
        if (!user) return null;
        try {
          return await user.getIdToken();
        } catch {
          return null;
        }
      },
    }),
    [ready, session, pendingApproval, configured, idleWarning, signedOutReason, signOutNow],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return value;
}

/* What each role is allowed to open. Kept beside the roles themselves so the
   navigation and the route guard cannot drift apart. The server enforces the
   same list; this only decides what is worth showing. */
export const ROLE_ACCESS: Record<AdminRole, string[]> = {
  owner: ["overview", "leads", "products", "content", "blog", "appearance", "faqs", "testimonials", "team", "audit"],
  editor: ["products", "content", "blog", "appearance", "faqs", "testimonials"],
  agent: ["overview", "leads"],
};

export function canOpen(role: AdminRole, section: string) {
  return ROLE_ACCESS[role].includes(section);
}
