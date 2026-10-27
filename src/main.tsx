import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

if (!Capacitor.isNativePlatform()) {
  // Keep home-screen identity, without an app-shell cache or automatic reloads.
  const manifest = document.createElement("link");
  manifest.rel = "manifest";
  manifest.href = "/manifest.webmanifest";
  document.head.appendChild(manifest);
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
