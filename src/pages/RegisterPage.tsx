import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { WorkScheduleForm } from '../components/ui/WorkScheduleForm';
import { authService } from '../api/authService';
import { useFloatingColumns } from '../hooks/useFloatingColumns';
import type { RegisterData, WorkScheduleDay } from '../types';
import './RegisterPage.scss';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    timezone: 'Europe/Moscow',
  });

  const [workSchedule, setWorkSchedule] = useState<WorkScheduleDay[]>([]);
  const [workingDaysCount, setWorkingDaysCount] = useState(5);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({ work_schedule: true });
  const [totalWorkingHours, setTotalWorkingHours] = useState(40);

  const validateField = (field: keyof typeof formData, value: string): string => {
    switch (field) {
      case 'username':
        if (!value.trim()) return 'Имя пользователя обязательно';
        return '';
      case 'email':
        if (!value.trim()) return 'Email обязателен';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Неверный формат email';
        return '';
      case 'password':
        if (!value) return 'Пароль обязателен';
        if (value.length < 8) return 'Пароль должен содержать минимум 8 символов';
        return '';
      case 'full_name':
        if (!value.trim()) return 'Полное имя обязательно';
        return '';
      case 'timezone':
        if (!value.trim()) return 'Часовой пояс обязателен';
        if (!/^[A-Za-z_]+\/[A-Za-z_]+$/.test(value)) return 'Неверный формат часового пояса';
        return '';
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    (Object.keys(formData) as (keyof typeof formData)[]).forEach((field) => {
      const msg = validateField(field, formData[field]);
      if (msg) newErrors[field] = msg;
    });

    if (workSchedule.length !== 7) {
      newErrors.work_schedule = 'Заполните расписание на все 7 дней';
    } else if (workingDaysCount > 6) {
      newErrors.work_schedule = 'Нельзя выбирать рабочими больше 6 дней в неделю';
    } else if (totalWorkingHours > 40) {
      newErrors.work_schedule = 'Суммарное рабочее время не должно превышать 40 часов в неделю';
    }

    setErrors(newErrors);
    const allTouched: Record<string, boolean> = {};
    (Object.keys(formData) as (keyof typeof formData)[]).forEach((f) => {
      allTouched[f] = true;
    });
    allTouched.work_schedule = true as any;
    setTouched(allTouched);

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
      const registerData: RegisterData = {
        ...formData,
        work_schedule: workSchedule,
      };

      await authService.register(registerData);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData({ ...formData, [field]: e.target.value });
      if (touched[field]) {
        const msg = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: msg }));
      }
    };

  const handleInputBlur = (field: keyof typeof formData) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = formData[field];
    const msg = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: msg }));
  };

  const columns = useFloatingColumns(15);

  return (
    <div className="register-page">
      <div className="register-page__background" aria-hidden="true">
        {columns.map((style, i) => (
          <div key={i} className="register-page__column" style={style} />
        ))}
      </div>
      <Card className="register-page__card">
        <div className="register-page__header">
          <h1>Регистрация</h1>
          <p>Создайте аккаунт в Project Calendar</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="Имя пользователя"
            type="text"
            value={formData.username}
            onChange={handleInputChange('username')}
            onBlur={handleInputBlur('username')}
            error={errors.username}
            required
          />

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
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            onBlur={handleInputBlur('password')}
            error={errors.password}
            required
          />

          <Input
            label="Полное имя"
            type="text"
            value={formData.full_name}
            onChange={handleInputChange('full_name')}
            onBlur={handleInputBlur('full_name')}
            error={errors.full_name}
            required
          />

          <Input
            label="Часовой пояс"
            type="text"
            value={formData.timezone}
            onChange={handleInputChange('timezone')}
            onBlur={handleInputBlur('timezone')}
            error={errors.timezone}
            required
          />

          <WorkScheduleForm
            onChange={setWorkSchedule}
            onWorkingDaysChange={setWorkingDaysCount}
            onTotalHoursChange={setTotalWorkingHours}
          />

          {(errors.work_schedule ||
            (touched.work_schedule && (workingDaysCount > 6 || totalWorkingHours > 40))) && (
            <div className="register-page__error">
              {errors.work_schedule ||
                (workingDaysCount > 6
                  ? 'Нельзя выбирать рабочими больше 6 дней в неделю'
                  : 'Суммарное рабочее время не должно превышать 40 часов в неделю')}
            </div>
          )}

          {error && <div className="register-page__error">{error}</div>}

          <Button type="submit" loading={loading} size="lg" className="register-page__submit">
            Зарегистрироваться
          </Button>

          <div className="register-page__footer">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default RegisterPage;
