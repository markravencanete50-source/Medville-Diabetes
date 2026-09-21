import { initializeApp, type FirebaseApp } from "firebase/app";
import { firebaseConfig } from "../lib/firebaseConfig";

let app: FirebaseApp | null = null;

/*
  Keep the lightweight Firebase app bootstrap separate from Auth and Firestore.
  The sign-in screen needs Auth immediately, while Firestore is only needed
  after an administrator opens a website editor. Keeping the services in their
  own lazy chunks prevents the database SDK from delaying every login.
*/
export function adminFirebaseApp() {
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}
