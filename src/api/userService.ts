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
};
