import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const root = createRoot(document.getElementById("root")!);
const render = (PublicSite?: ComponentType) => root.render(
  <StrictMode><App PublicSite={PublicSite} /></StrictMode>,
);

if (window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/")) {
  render();
} else {
  // Keep the complete prerendered page visible until its interactive code is
  // ready. Rendering a Suspense fallback first cleared it on every visit.
  import("./PublicSite").then(({ default: PublicSite }) => render(PublicSite));
}
