import { BrowserRouter } from "react-router-dom";
import { CenteredPanel } from "@/components/ui/CenteredPanel";
import { AdminAuthProvider } from "@/features/auth/AdminAuthProvider";
import { RequireAdmin } from "@/features/auth/RequireAdmin";
import { initFirebase } from "@/lib/firebase";
import { MissingEnvError } from "@/lib/env";
import { AppRoutes } from "@/routes/router";

export function App() {
  let services;
  try {
    services = initFirebase();
  } catch (error) {
    // No mock mode, no partial boot. If Firebase isn't configured the app says
    // so instead of rendering a dashboard over nothing.
    const detail =
      error instanceof MissingEnvError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown error.";
    return (
      <CenteredPanel>
        <h1 className="mb-2 text-section font-semibold text-fg">Not configured</h1>
        <p className="text-body text-fg-muted">{detail}</p>
      </CenteredPanel>
    );
  }

  return (
    <AdminAuthProvider auth={services.auth}>
      <RequireAdmin>
        <BrowserRouter>
          <AppRoutes usingEmulators={services.usingEmulators} />
        </BrowserRouter>
      </RequireAdmin>
    </AdminAuthProvider>
  );
}
