import { useEffect } from "react";
import { apiClient } from "../api/client";
import { authService } from "../api/authService";

const CHECK_INTERVAL_MS = 4 * 60 * 1000; // каждые 4 минуты

export function useTokenKeepalive() {
  useEffect(() => {
    if (!authService.isAuthenticated()) return;

    const check = async () => {
      try {
        await apiClient.get("/auth/me");
      } catch {
        // 401 → axios interceptor в client.ts автоматически делает logout+redirect
      }
    };

    // Первая проверка через 4 минуты, затем повторяется
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}
