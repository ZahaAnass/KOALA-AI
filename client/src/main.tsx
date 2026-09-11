import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "@/i18n";
import "@/index.css";
import { Providers } from "@/components/layout/Providers";
import App from "@/App";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY. Copy client/.env.example to client/.env and fill it in.");
}

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers publishableKey={PUBLISHABLE_KEY}>
      <App />
    </Providers>
  </StrictMode>,
);
