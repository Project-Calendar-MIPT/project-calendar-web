import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/Button";
import { authService } from "../api/authService";
import { useTheme } from "../context/ThemeContext";
import "./Header.scss";

export const Header: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    authService.logout();
  };

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  return (
    <header className="header">
      <div className="header__container">
        <div className="header__logo">
          <Link to="/">📅 Project Calendar</Link>
        </div>

        <nav
          className={`header__nav ${mobileMenuOpen ? "header__nav--open" : ""}`}
        >
          <Link
            to="/"
            className={`header__link ${isActive("/") ? "header__link--active" : ""}`}
          >
            Проекты
          </Link>
          <Link
            to="/calendar"
            className={`header__link ${isActive("/calendar") ? "header__link--active" : ""}`}
          >
            Календарь
          </Link>
          <Link
            to="/profile"
            className={`header__link ${isActive("/profile") ? "header__link--active" : ""}`}
          >
            Профиль
          </Link>
        </nav>

        <div className="header__actions">
          <button
            className="header__theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === "light" ? "Тёмная тема" : "Светлая тема"}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <Button onClick={handleLogout} variant="outline" size="sm">
            Выход
          </Button>

          <button
            className="header__hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );
};
