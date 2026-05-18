import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../client", () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

import { apiClient } from "../client";
import { authService } from "../authService";
import type { RegisterData } from "../../types";

const baseRegisterData: RegisterData = {
  email: "test@example.com",
  password: "secret",
  first_name: "Иван",
  last_name: "Петров",
  timezone: "Europe/Moscow",
  contacts_visible: true,
  stack: [],
  work_schedule: [],
};

describe("authService.register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  it("does not send login or username fields", async () => {
    (apiClient.post as any).mockResolvedValue({ data: {} });

    await authService.register(baseRegisterData);

    const [, payload] = (apiClient.post as any).mock.calls[0];
    expect(payload).not.toHaveProperty("login");
    expect(payload).not.toHaveProperty("username");
  });

  it("sends email and password", async () => {
    (apiClient.post as any).mockResolvedValue({ data: {} });

    await authService.register(baseRegisterData);

    const [, payload] = (apiClient.post as any).mock.calls[0];
    expect(payload.email).toBe("test@example.com");
    expect(payload.password).toBe("secret");
  });

  it("returns emailSent:true when backend returns no token", async () => {
    (apiClient.post as any).mockResolvedValue({ data: {} });

    const result = await authService.register(baseRegisterData);
    expect(result).toEqual({ emailSent: true });
  });

  it("returned User object has no username field", async () => {
    (apiClient.post as any).mockResolvedValue({
      data: {
        token: "tok",
        user: { id: "uuid-1", email: "test@example.com", name: "Иван", surname: "Петров" },
      },
    });

    const result = await authService.register(baseRegisterData);
    if ("user" in result) {
      expect(result.user).not.toHaveProperty("username");
      expect(result.user.email).toBe("test@example.com");
    }
  });
});
