import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

if (!Capacitor.isNativePlatform()) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisteredSW(_url, registration) {
        if (!registration) return;
        // Check for a new published build on load, on focus, and hourly, so a
        // cached app shell can never keep serving an old UI.
        const check = () => registration.update().catch(() => {});
        check();
        window.addEventListener("focus", check);
        setInterval(check, 60 * 60 * 1000);
      },
    });
  });

  // A new service worker took control => the shell changed. Reload once so the
  // user sees the freshly published UI instead of the cached one.
  if ("serviceWorker" in navigator) {
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
