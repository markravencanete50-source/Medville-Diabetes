import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

/*
  Keep the public website and the dashboard behind separate route chunks.
  An administrator should not download every marketing page before the sign-in
  form can appear, and a visitor should not download Firebase administration
  code. Each side now loads only what it needs.
*/
const AdminApp = lazy(() => import("./admin/AdminApp"));
const PublicSite = lazy(() => import("./PublicSite"));

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
        <Route
          path="*"
          element={
            <Suspense fallback={null}>
              <PublicSite />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
