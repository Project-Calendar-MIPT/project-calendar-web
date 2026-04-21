import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { authService } from "../api/authService";
import { useFloatingColumns } from "../hooks/useFloatingColumns";
import "./LoginPage.scss";

const EMAIL_ALLOWED_CHARACTERS_REGEX = /^[A-Za-z0-9._%+\-@]*$/;
const EMAIL_FORMAT_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PASSWORD_ALLOWED_CHARACTERS_REGEX =
  /^[A-Za-z0-9!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+$/;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<keyof typeof formData, boolean>>({
    email: false,
    password: false,
  });

  const validateField = (field: keyof typeof formData, value: string): string => {
    if (field === 'email') {
      if (!value.trim()) return 'Email обязателен';
      if (!EMAIL_ALLOWED_CHARACTERS_REGEX.test(value)) {
        return 'Допустимы только латинские буквы, цифры и символы @ . _ % + -';
      }
      if (!EMAIL_FORMAT_REGEX.test(value)) {
        return 'Неверный формат email. Пример: user@example.com';
      }
      return '';
    }

    if (!value) return 'Пароль обязателен';
    if (!PASSWORD_ALLOWED_CHARACTERS_REGEX.test(value)) {
      return 'Допустимы только латинские буквы, цифры и спецсимволы клавиатуры';
    }
    return '';
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const emailError = validateField('email', formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validateField('password', formData.password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    setTouched({ email: true, password: true });
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await authService.login(formData);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Ошибка при входе");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData({ ...formData, [field]: value });

      if (touched[field]) {
        const fieldError = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: fieldError }));
      }

      // Очищаем общую ошибку при изменении поля
      if (error) {
        setError("");
      }
    };

  const handleInputBlur = (field: keyof typeof formData) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const fieldError = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: fieldError }));
  };

  const columns = useFloatingColumns(15);

  const passwordToggleIcon = showPassword ? (
    // Slashed eye when password is visible.
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M3 4l18 16M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58M9.88 5.1A10.94 10.94 0 0112 5c6 0 9.5 7 9.5 7a16.35 16.35 0 01-4.16 4.95M6.61 7.24A16.28 16.28 0 002.5 12S6 19 12 19a10.94 10.94 0 004.12-.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    // Open eye when password is hidden.
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M2.5 12S6 5 12 5s9.5 7 9.5 7S18 19 12 19 2.5 12 2.5 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );

  return (
    <div className="login-page">
      <div className="login-page__background" aria-hidden="true">
        {columns.map((column) => (
          <div
            key={column.id}
            className="login-page__column"
            style={column.style}
          />
        ))}
      </div>
      <Card className="login-page__card">
        <div className="login-page__header">
          <h1>Вход</h1>
          <p>Войдите в свой аккаунт Project Calendar</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            onBlur={handleInputBlur('email')}
            error={errors.email}
            required
          />

          <Input
            label="Пароль"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleInputChange('password')}
            onBlur={handleInputBlur('password')}
            error={errors.password}
            rightAdornment={
              <button
                type="button"
                className="login-page__password-icon-button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                aria-pressed={showPassword}
              >
                {passwordToggleIcon}
              </button>
            }
            required
          />

          {error && <div className="login-page__error">{error}</div>}

          <Button
            type="submit"
            loading={loading}
            size="lg"
            className="login-page__submit"
          >
            Войти
          </Button>

          <div className="login-page__footer">
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
