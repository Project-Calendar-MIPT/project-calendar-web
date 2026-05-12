import { apiClient } from "./client";
import type { User } from "../types";

export const userService = {
  async searchUsers(query: string): Promise<User[]> {
    if (!query || query.length < 2) return [];

    try {
      const response = await apiClient.get<any[]>("/users", {
        params: { search: query },
      });
      return (response.data || []).map(
        (u: any): User => ({
          id: u.id ?? "",
          username: u.display_name ?? u.username ?? "",
          email: u.email ?? "",
          first_name: u.name ?? u.first_name ?? "",
          last_name: u.surname ?? u.last_name ?? "",
          timezone: u.timezone ?? "Europe/Moscow",
          contacts_visible: u.contacts_visible ?? true,
        }),
      );
    } catch {
      return [];
    }
  },

  async getAvailability(
    userId: string,
    week: string
  ): Promise<{ date: string; busy_slots: { start: string; end: string }[] }[]> {
    try {
      const res = await apiClient.get(`/users/${userId}/availability`, { params: { week } });
      return res.data || [];
    } catch { return []; }
  },

  async getSubordinates(): Promise<{ id: string; display_name: string; email: string }[]> {
    try {
      const res = await apiClient.get("/users/my-subordinates");
      return res.data || [];
    } catch { return []; }
  },

  async isSubordinate(userId: string): Promise<boolean> {
    try {
      const res = await apiClient.get<{ is_subordinate: boolean }>(`/users/${userId}/is-subordinate`);
      return res.data?.is_subordinate ?? false;
    } catch { return false; }
  },
};
