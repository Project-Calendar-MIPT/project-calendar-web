import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { authService } from '../api/authService';
import './LoginPage.scss';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email обязателен';
    } else {
      // Проверка формата email: должен быть @ и хотя бы одна точка после @
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Неверный формат email. Пример: user@example.com';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await authService.login(formData);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [field]: e.target.value });
      if (errors[field]) {
        setErrors({ ...errors, [field]: '' });
      }
      // Очищаем общую ошибку при изменении поля
      if (error) {
        setError('');
      }
    };

  const columnsRef = useRef<any[]>();
  if (!columnsRef.current) {
    columnsRef.current = [...Array(15)].map((_, i) => {
      const depth = Math.random();
      const scale = depth * 0.6 + 0.4;
      const width = 30 + scale * 30;
      const height = 60 + scale * 80;
      const duration = 14 + (1 - scale) * 6;
      const leftOffset = Math.random() * 3;
      const delay = -Math.random() * duration;

      return {
        left: `${i * 6.5 + leftOffset}%`,
        width: `${width}px`,
        height: `${height}px`,
        opacity: scale * 0.6 + 0.2,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        zIndex: Math.floor(scale * 10),
      };
    });
  }

  return (
    <div className="login-page">
      <div className="login-page__background">
        {columnsRef.current.map((style, i) => (
          <div key={i} className="login-page__column" style={style} />
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
            error={errors.email}
            required
          />

          <Input
            label="Пароль"
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            error={errors.password}
            required
          />

          {error && <div className="login-page__error">{error}</div>}

          <Button type="submit" loading={loading} size="lg" className="login-page__submit">
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
