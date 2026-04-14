import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme } from "@/lib/themePreference";

// Start in light mode; app router/auth layer will apply user preference from DB.
applyTheme(false);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
