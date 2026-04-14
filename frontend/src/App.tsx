import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { AIChatbot } from "@/components/AIChatbot";
import { NetworkLoadingScreen } from "@/components/NetworkLoadingScreen";
import { useStartupNetworkCheck } from "@/hooks/useStartupNetworkCheck";
import { applyTheme } from "@/lib/themePreference";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import InspectPage from "./pages/Index";
import HistoryPage from "./pages/HistoryPage";
import AdminDashboard from "./pages/AdminDashboard";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
      <AIChatbot />
    </>
  );
}

function NetworkStartupGate({ children }: { children: React.ReactNode }) {
  const { status, retry } = useStartupNetworkCheck();

  if (status !== "ready") {
    return <NetworkLoadingScreen status={status} onRetry={retry} />;
  }

  return <>{children}</>;
}

function ThemeRouteController() {
  const location = useLocation();
  const { user, profile } = useAuth();

  useEffect(() => {
    const forceLightPaths = new Set(["/", "/signup", "/login", "/forgot-password", "/reset-password"]);
    const forceLight = forceLightPaths.has(location.pathname);
    if (forceLight) {
      applyTheme(false);
      return;
    }

    const isDarkMode = Boolean(user && profile?.is_dark_mode);
    applyTheme(isDarkMode);
  }, [location.pathname, user, profile?.is_dark_mode]);

  return null;
}

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NetworkStartupGate>
          <AuthProvider>
            <ThemeRouteController />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Protected app routes */}
              <Route path="/inspect" element={<ProtectedRoute><AppLayout><InspectPage /></AppLayout></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><AppLayout><HistoryPage /></AppLayout></ProtectedRoute>} />
              <Route path="/dashboard" element={<Navigate to="/history" replace />} />
              <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/admin" element={<AdminRoute><AppLayout><AdminDashboard /></AppLayout></AdminRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </NetworkStartupGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
