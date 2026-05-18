import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RegisterPage from "../RegisterPage";

vi.mock("../../api/authService", () => ({
  authService: { register: vi.fn() },
}));

vi.mock("../../hooks/useFloatingColumns", () => ({
  useFloatingColumns: () => [],
}));

vi.mock("../../components/ui/WorkScheduleForm", () => ({
  WorkScheduleForm: () => null,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );

describe("RegisterPage", () => {
  it("does not render a Логин (login) input field", () => {
    renderPage();
    expect(screen.queryByLabelText(/логин/i)).toBeNull();
    expect(screen.queryByText(/^логин$/i)).toBeNull();
  });

  it("renders Email, Password fields", () => {
    renderPage();
    expect(screen.getByText(/^email$/i)).toBeTruthy();
    expect(screen.getByText(/^пароль$/i)).toBeTruthy();
  });

  it("renders personal info fields", () => {
    renderPage();
    expect(screen.getByText(/^фамилия$/i)).toBeTruthy();
    expect(screen.getByText(/^имя$/i)).toBeTruthy();
  });
});
