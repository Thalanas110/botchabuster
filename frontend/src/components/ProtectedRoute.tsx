import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";
import { NetworkLoadingScreen } from "@/components/NetworkLoadingScreen";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <NetworkLoadingScreen status="auth_loading" />;
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return <NetworkLoadingScreen status="auth_loading" />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/inspect" replace />;
  return <>{children}</>;
}
