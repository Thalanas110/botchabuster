import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme } from "@/lib/themePreference";
import { prewarmModel } from "@/lib/offlineAnalysis";

// Start in light mode; app router/auth layer will apply user preference from DB.
applyTheme(false);
// Start ONNX model warmup as early as possible in app boot.
prewarmModel();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
