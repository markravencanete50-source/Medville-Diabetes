import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductsLanding from "./pages/ProductsLanding";
import ProductDetail from "./pages/ProductDetail";
import Qualify from "./pages/Qualify";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Services from "./pages/Services";
import ReferPatient from "./pages/ReferPatient";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import { SiteDataProvider, usePageVisible } from "./lib/useSiteData";
import type { PageId } from "./content/schema";
import type { SiteData } from "./lib/siteContent";

/*
  The dashboard is one lazy chunk, so a marketing visitor never downloads
  it, the Firebase SDK, or anything it pulls in. It also sits outside the
  Header and Footer: it is a tool, not a page of the website.
*/
const AdminApp = lazy(() => import("./admin/AdminApp"));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/admin"
          element={
            <Suspense fallback={null}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="*" element={<PublicSite />} />
      </Routes>
    </BrowserRouter>
  );
}

/* Everything a visitor sees: the site chrome, the routes, and the client
   content layer that feeds them. */
export function PublicSite({ initialData }: { initialData?: SiteData } = {}) {
  return (
    <SiteDataProvider initialData={initialData}>
      <ScrollToHash />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-on-dark"
      >
        Skip to the main content
      </a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<PageGuard page="home"><Home /></PageGuard>} />
          <Route path="/products" element={<PageGuard page="products"><ProductsLanding /></PageGuard>} />
          <Route path="/products/cgm" element={<PageGuard page="products"><Products line="cgm" /></PageGuard>} />
          <Route path="/products/insulin-pumps" element={<PageGuard page="products"><Products line="insulin-pump" /></PageGuard>} />
          <Route path="/products/:slug" element={<PageGuard page="products"><ProductDetail /></PageGuard>} />
          <Route path="/services" element={<PageGuard page="services"><Services /></PageGuard>} />
          <Route path="/refer-a-patient" element={<PageGuard page="refer"><ReferPatient /></PageGuard>} />
          <Route path="/blog" element={<PageGuard page="blog"><Blog /></PageGuard>} />
          <Route path="/blog/:slug" element={<PageGuard page="blog"><BlogPost /></PageGuard>} />
          <Route path="/qualify" element={<PageGuard page="qualify"><Qualify /></PageGuard>} />
          <Route path="/about" element={<PageGuard page="about"><About /></PageGuard>} />
          <Route path="/contact" element={<PageGuard page="contact"><Contact /></PageGuard>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </SiteDataProvider>
  );
}

function PageGuard({ page, children }: { page: PageId; children: React.ReactNode }) {
  return usePageVisible(page) ? children : <NotFound />;
}

/*
  Starts a new page at its top, or scrolls to the named section.

  The footer links to the guides band and the questions band on the home page,
  which are sections rather than pages. React Router changes the address
  without scrolling, so this waits one frame for the page to render and then
  brings the target into view.
*/
function ScrollToHash() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const id = hash.slice(1);
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, pathname]);

  return null;
}
