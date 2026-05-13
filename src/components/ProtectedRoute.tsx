import React from "react";
import { Navigate } from "react-router-dom";
import { Layout } from "./Layout";
import { authService } from "../api/authService";
import { useTokenKeepalive } from "../hooks/useTokenKeepalive";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  useTokenKeepalive();
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

export default ProtectedRoute;
