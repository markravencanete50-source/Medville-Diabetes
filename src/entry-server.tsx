import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { PublicSite } from "./App";
import type { SiteData } from "./lib/siteContent";

export function renderPage(path: string, initialData: SiteData) {
  return renderToString(
    <StaticRouter location={path}>
      <PublicSite initialData={initialData} />
    </StaticRouter>,
  );
}
