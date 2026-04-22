import { apiClient } from "./client";
import type { RegisterData, LoginData, User } from "../types";

interface AuthResponse {
  token: string;
  user: User;
}

interface EmailSentResponse {
  emailSent: true;
}

// Map backend user object (display_name, name, surname) → frontend User type
function mapBackendUser(backendUser: any): User {
  return {
    id: backendUser.id ?? "",
    username: backendUser.display_name ?? backendUser.username ?? "",
    email: backendUser.email ?? "",
    first_name: backendUser.name ?? backendUser.first_name ?? "",
    last_name: backendUser.surname ?? backendUser.last_name ?? "",
    middle_name: backendUser.middle_name,
    timezone: backendUser.timezone ?? "Europe/Moscow",
    telegram: backendUser.telegram,
    phone: backendUser.phone,
    contacts_visible: backendUser.contacts_visible ?? true,
    stack: backendUser.stack,
    experience_level: backendUser.experience_level,
  };
}

export const authService = {
  async register(
    data: RegisterData,
  ): Promise<AuthResponse | EmailSentResponse> {
    const payload = {
      email: data.email,
      password: data.password,
      display_name: `${data.first_name} ${data.last_name}`.trim(),
      name: data.first_name,
      surname: data.last_name,
      middle_name: data.middle_name,
      timezone: data.timezone,
      telegram: data.telegram,
      phone: data.phone,
      contacts_visible: data.contacts_visible,
      stack: data.stack,
      work_schedule: data.work_schedule
        .filter((d) => d.is_working_day && d.start_time && d.end_time)
        .map((d) => ({
          weekday: d.day_of_week,
          start_time: d.start_time,
          end_time: d.end_time,
        })),
      ...(data.experience_level ? { experience_level: data.experience_level } : {}),
    };

    const response = await apiClient.post("/auth/register", payload);
    const body = response.data;

    if (!body.token) {
      return { emailSent: true };
    }

    const token: string = body.token;
    const user = mapBackendUser({
      ...body.user,
      telegram: data.telegram,
      phone: data.phone,
    });

    localStorage.setItem("auth_token", token);
    localStorage.setItem("current_user", JSON.stringify(user));

    return { token, user };
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post("/auth/login", {
      email: data.email,
      password: data.password,
    });
    const body = response.data;
    const token: string = body.token;
    const user = mapBackendUser(body.user);

    localStorage.setItem("auth_token", token);
    localStorage.setItem("current_user", JSON.stringify(user));

    return { token, user };
  },

  async getCurrentUser(): Promise<User> {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("Not authenticated");
    }

    // Return cached user only if it has full profile data (first_name present)
    const savedUser = localStorage.getItem("current_user");
    if (savedUser) {
      const u = JSON.parse(savedUser) as User;
      if (u.first_name) return u;
    }

    // Fetch full profile from API
    const response = await apiClient.get("/auth/me");
    const user = mapBackendUser(response.data);
    localStorage.setItem("current_user", JSON.stringify(user));
    return user;
  },

  logout(): void {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("current_user");
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    window.location.href = base + "/login";
  },

  getToken(): string | null {
    return localStorage.getItem("auth_token");
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
