/*
  The Firebase web configuration for medville-diabetes.

  These values are committed on purpose. A Firebase web configuration is
  public by design: it identifies the project, it does not grant access to
  anything in it. Every Firebase web app ships these values in its own
  JavaScript, and Google documents them as safe to expose.

  What actually protects the data is elsewhere and unaffected by anyone
  reading this file:

  - firestore.rules denies the leads collection to every browser, signed in
    or not. Patient records are reachable only through the adminApi function.
  - storage.rules allows writes only to a signed-in administrator with a
    content role.
  - Signing in requires an account that an owner created. Self sign-up is
    turned off, so knowing the API key does not let anyone make an account.

  Committing them, rather than threading five build secrets through GitHub
  Actions, keeps the deploy reproducible and removes a step where a missing
  secret would silently ship a dashboard that cannot sign in.

  An environment variable still wins where one is set, so a second
  environment, or the client's own project after handover, needs no code
  change. See .env.example.
*/

const BUILT_IN = {
  apiKey: "AIzaSyCijwWdmVna5JTUV8dxQNiZc7q1y9X0jkE",
  authDomain: "medville-diabetes.firebaseapp.com",
  projectId: "medville-diabetes",
  storageBucket: "medville-diabetes.firebasestorage.app",
  appId: "1:1092307865073:web:ffc7a2d42c816a8664c850",
};

function pick(fromEnv: string | undefined, builtIn: string) {
  return fromEnv && fromEnv.trim() !== "" ? fromEnv.trim() : builtIn;
}

export const firebaseConfig = {
  apiKey: pick(import.meta.env.VITE_FIREBASE_API_KEY as string | undefined, BUILT_IN.apiKey),
  authDomain: pick(
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    BUILT_IN.authDomain,
  ),
  projectId: pick(
    import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    BUILT_IN.projectId,
  ),
  storageBucket: pick(
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
    BUILT_IN.storageBucket,
  ),
  appId: pick(import.meta.env.VITE_FIREBASE_APP_ID as string | undefined, BUILT_IN.appId),
};
