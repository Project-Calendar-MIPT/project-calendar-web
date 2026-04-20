import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { WorkScheduleForm } from '../components/ui/WorkScheduleForm';
import { authService } from '../api/authService';
import { useFloatingColumns } from '../hooks/useFloatingColumns';
import type { ExperienceLevel, RegisterData, StackItem, WorkScheduleDay } from '../types';
import './RegisterPage.scss';

const USERNAME_ALLOWED_REGEX = /^[A-Za-z0-9._-]+$/;

const PASSWORD_DIGIT_REGEX = /\d/;
const PASSWORD_SPECIAL_CHAR_REGEX = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;
const PASSWORD_ALLOWED_CHARACTERS_REGEX = /^[A-Za-z0-9!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+$/;
const EXPERIENCE_LEVELS: ExperienceLevel[] = ['junior', 'middle', 'senior'];
const EXPERIENCE_OPTIONS = [
  { value: 'junior', label: 'Junior' },
  { value: 'middle', label: 'Middle' },
  { value: 'senior', label: 'Senior' },
];
const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
};
const TECHNOLOGY_OPTIONS = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C#',
  'C++',
  'Go',
  'PHP',
  'Kotlin',
  'Swift',
  'Rust',
  'SQL',
  'React',
  'Node.js',
  '.NET',
  'Docker',
];

type StackSelectionItem = StackItem & {
  custom_level: boolean;
};

type PasswordRules = {
  hasMinLength: boolean;
  hasDigit: boolean;
  hasSpecialChar: boolean;
};

const getPasswordRules = (password: string): PasswordRules => ({
  hasMinLength: password.length >= 8,
  hasDigit: PASSWORD_DIGIT_REGEX.test(password),
  hasSpecialChar: PASSWORD_SPECIAL_CHAR_REGEX.test(password),
});

const capitalizeWord = (word: string): string => {
  if (!word) return word;
  return `${word.charAt(0).toLocaleUpperCase('ru-RU')}${word.slice(1).toLocaleLowerCase('ru-RU')}`;
};

const normalizeFioValue = (value: string): string => {
  const normalizedSpaces = value.trim().replace(/\s+/g, ' ');
  if (!normalizedSpaces) return '';

  return normalizedSpaces
    .split(' ')
    .map((part) => part.split('-').map(capitalizeWord).join('-'))
    .join(' ');
};

const getPasswordStrength = (
  rules: PasswordRules,
): { score: number; label: string; tone: string } => {
  const score = Number(rules.hasMinLength) + Number(rules.hasDigit) + Number(rules.hasSpecialChar);

  if (score <= 1) {
    return { score, label: 'Слабый', tone: 'weak' };
  }

  if (score === 2) {
    return { score, label: 'Средний', tone: 'medium' };
  }

  return { score, label: 'Сильный', tone: 'strong' };
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    last_name: '',
    first_name: '',
    middle_name: '',
    timezone: 'Europe/Moscow',
    telegram: '',
    phone: '',
    stack: [] as StackSelectionItem[],
    experience_level: '' as ExperienceLevel | '',
  });

  const [workSchedule, setWorkSchedule] = useState<WorkScheduleDay[]>([]);
  const [workingDaysCount, setWorkingDaysCount] = useState(5);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({ work_schedule: true });
  const [totalWorkingHours, setTotalWorkingHours] = useState(40);
  const [showPassword, setShowPassword] = useState(false);
  const [customTechnology, setCustomTechnology] = useState('');
  const passwordRules = getPasswordRules(formData.password);
  const passwordStrength = getPasswordStrength(passwordRules);

  const validateField = (
    field: keyof typeof formData,
    value: string | boolean | StackSelectionItem[],
  ): string => {
    if (typeof value === 'boolean' || Array.isArray(value)) return '';

    switch (field) {
      case 'username':
        if (!value.trim()) return 'Логин обязателен';
        if (!USERNAME_ALLOWED_REGEX.test(value)) {
          return 'Допустимы только латинские буквы, цифры и символы . _ -';
        }
        return '';
      case 'email':
        if (!value.trim()) return 'Email обязателен';
        return '';
      case 'password':
        if (!value) return 'Пароль обязателен';
        if (!PASSWORD_ALLOWED_CHARACTERS_REGEX.test(value)) {
          return 'Допустимы только латинские буквы, цифры и спецсимволы клавиатуры';
        }
        if (value.length < 8) return 'Пароль должен содержать минимум 8 символов';
        if (!PASSWORD_DIGIT_REGEX.test(value)) return 'Пароль должен содержать минимум одну цифру';
        if (!PASSWORD_SPECIAL_CHAR_REGEX.test(value)) {
          return 'Пароль должен содержать минимум один спецсимвол';
        }
        return '';
      case 'last_name':
        if (!value.trim()) return 'Фамилия обязательна';
        return '';
      case 'first_name':
        if (!value.trim()) return 'Имя обязательно';
        return '';
      case 'middle_name':
        return ''; // Необязательное поле
      case 'timezone':
        if (!value.trim()) return 'Часовой пояс обязателен';
        if (!/^[A-Za-z_]+\/[A-Za-z_]+$/.test(value)) return 'Неверный формат часового пояса';
        return '';
      case 'telegram':
        if (value && !/^@?[a-zA-Z0-9_]{5,32}$/.test(value))
          return 'Неверный формат Telegram (например: @username)';
        return '';
      case 'phone':
        if (value && !/^\+?[0-9\s\-()]{10,}$/.test(value)) return 'Неверный формат телефона';
        return '';
      case 'experience_level':
        if (!value) return '';
        if (!EXPERIENCE_LEVELS.includes(value as ExperienceLevel)) {
          return 'Выберите уровень опыта из списка';
        }
        return '';
      default:
        return '';
    }
  };

  const validateStack = (stack: StackSelectionItem[]): string => {
    if (stack.length === 0) return '';

    const hasInvalidLevel = stack.some(
      (item) => !EXPERIENCE_LEVELS.includes(item.experience_level),
    );
    if (hasInvalidLevel) return 'Укажите уровень для каждой технологии';

    return '';
  };

  const validateForm = (
    data: typeof formData = formData,
    schedule: WorkScheduleDay[] = workSchedule,
  ): boolean => {
    const newErrors: Record<string, string> = {};

    (Object.keys(data) as (keyof typeof data)[]).forEach((field) => {
      const msg = validateField(field, data[field]);
      if (msg) newErrors[field] = msg;
    });

    const stackError = validateStack(data.stack);
    if (stackError) {
      newErrors.stack = stackError;
    }

    if (schedule.length !== 7) {
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

    const normalizedFormData = {
      ...formData,
      last_name: normalizeFioValue(formData.last_name),
      first_name: normalizeFioValue(formData.first_name),
      middle_name: normalizeFioValue(formData.middle_name),
    };
    setFormData(normalizedFormData);

    if (!validateForm(normalizedFormData)) {
      return;
    }

    setLoading(true);

    try {
      const registerData: RegisterData = {
        username: normalizedFormData.username,
        email: normalizedFormData.email,
        password: normalizedFormData.password,
        last_name: normalizedFormData.last_name,
        first_name: normalizedFormData.first_name,
        middle_name: normalizedFormData.middle_name,
        timezone: normalizedFormData.timezone,
        telegram: normalizedFormData.telegram,
        phone: normalizedFormData.phone,
        contacts_visible: true,
        stack: normalizedFormData.stack.map((item) => ({
          name: item.name,
          experience_level: item.experience_level,
        })),
        ...(normalizedFormData.experience_level
          ? { experience_level: normalizedFormData.experience_level as ExperienceLevel }
          : {}),
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
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setFormData({ ...formData, [field]: value });
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

  const updateStack = (nextStack: StackSelectionItem[]) => {
    setFormData((prev) => ({ ...prev, stack: nextStack }));
    setTouched((prev) => ({ ...prev, stack: true }));
    setErrors((prev) => ({ ...prev, stack: validateStack(nextStack) }));
  };

  const toggleTechnology = (technology: string) => {
    const isSelected = formData.stack.some((item) => item.name === technology);
    const nextStack = isSelected
      ? formData.stack.filter((item) => item.name !== technology)
      : [
          ...formData.stack,
          {
            name: technology,
            experience_level: (formData.experience_level || 'junior') as ExperienceLevel,
            custom_level: false,
          },
        ];
    updateStack(nextStack);
  };

  const addCustomTechnology = () => {
    const normalized = customTechnology.trim();
    if (!normalized) return;

    const exists = formData.stack.some(
      (item) => item.name.toLowerCase() === normalized.toLowerCase(),
    );
    if (!exists) {
      updateStack([
        ...formData.stack,
        {
          name: normalized,
          experience_level: (formData.experience_level || 'junior') as ExperienceLevel,
          custom_level: false,
        },
      ]);
    }
    setCustomTechnology('');
  };

  const removeTechnology = (technology: string) => {
    updateStack(formData.stack.filter((item) => item.name !== technology));
  };

  const handleExperienceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ExperienceLevel | '';
    setFormData((prev) => ({
      ...prev,
      experience_level: value,
      stack: prev.stack.map((item) =>
        item.custom_level || !value
          ? item
          : {
              ...item,
              experience_level: value as ExperienceLevel,
            },
      ),
    }));
    setTouched((prev) => ({ ...prev, experience_level: true }));
    setErrors((prev) => ({ ...prev, experience_level: validateField('experience_level', value) }));
  };

  const handleTechnologyLevelChange = (technology: string, level: ExperienceLevel) => {
    const nextStack = formData.stack.map((item) =>
      item.name === technology
        ? {
            ...item,
            experience_level: level,
            custom_level: true,
          }
        : item,
    );
    updateStack(nextStack);
  };

  const resetTechnologyLevel = (technology: string) => {
    const defaultLevel = (formData.experience_level || 'junior') as ExperienceLevel;
    const nextStack = formData.stack.map((item) =>
      item.name === technology
        ? {
            ...item,
            experience_level: defaultLevel,
            custom_level: false,
          }
        : item,
    );
    updateStack(nextStack);
  };

  const columns = useFloatingColumns(24);

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
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );

  return (
    <div className="register-page">
      <div className="register-page__background" aria-hidden="true">
        {columns.map((column) => (
          <div key={column.id} className="register-page__column" style={column.style} />
        ))}
      </div>
      <Card className="register-page__card">
        <div className="register-page__header">
          <h1>Регистрация</h1>
          <p>Создайте аккаунт в Project Calendar</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="register-page__section">
            <h2 className="register-page__section-title">Учетные данные</h2>
            <Input
              label="Логин"
              type="text"
              value={formData.username}
              onChange={handleInputChange('username')}
              onBlur={handleInputBlur('username')}
              error={errors.username}
              required
            />

            <Input
              label="Email"
              type="text"
              value={formData.email}
              onChange={handleInputChange('email')}
              onBlur={handleInputBlur('email')}
              error={errors.email}
              required
            />

            <Input
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange('password')}
              onBlur={handleInputBlur('password')}
              error={errors.password}
              rightAdornment={
                <button
                  type="button"
                  className="register-page__password-icon-button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  aria-pressed={showPassword}
                >
                  {passwordToggleIcon}
                </button>
              }
              required
            />

            {formData.password && (
              <div className="register-page__password-strength" aria-live="polite">
                <div className="register-page__password-strength-header">
                  <span>Надежность пароля: {passwordStrength.label}</span>
                  <span>{passwordStrength.score}/3</span>
                </div>
                <div className="register-page__password-strength-track" aria-hidden="true">
                  <div
                    className={`register-page__password-strength-fill register-page__password-strength-fill--${passwordStrength.tone}`}
                    style={{ width: `${(passwordStrength.score / 3) * 100}%` }}
                  />
                </div>
                <ul className="register-page__password-checklist">
                  <li
                    className={`register-page__password-checkitem ${passwordRules.hasMinLength ? 'register-page__password-checkitem--ok' : ''}`}
                  >
                    Минимум 8 символов
                  </li>
                  <li
                    className={`register-page__password-checkitem ${passwordRules.hasDigit ? 'register-page__password-checkitem--ok' : ''}`}
                  >
                    Минимум одна цифра
                  </li>
                  <li
                    className={`register-page__password-checkitem ${passwordRules.hasSpecialChar ? 'register-page__password-checkitem--ok' : ''}`}
                  >
                    Минимум один спецсимвол
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="register-page__section">
            <h2 className="register-page__section-title">Личная информация</h2>
            <Input
              label="Фамилия"
              type="text"
              value={formData.last_name}
              onChange={handleInputChange('last_name')}
              onBlur={handleInputBlur('last_name')}
              error={errors.last_name}
              required
            />

            <Input
              label="Имя"
              type="text"
              value={formData.first_name}
              onChange={handleInputChange('first_name')}
              onBlur={handleInputBlur('first_name')}
              error={errors.first_name}
              required
            />

            <Input
              label="Отчество"
              type="text"
              value={formData.middle_name}
              onChange={handleInputChange('middle_name')}
              onBlur={handleInputBlur('middle_name')}
              error={errors.middle_name}
            />
          </div>

          <div className="register-page__section">
            <h2 className="register-page__section-title">Контакты</h2>
            <Input
              label="Telegram"
              type="text"
              placeholder="@username"
              value={formData.telegram}
              onChange={handleInputChange('telegram')}
              onBlur={handleInputBlur('telegram')}
              error={errors.telegram}
            />

            <Input
              label="Номер телефона"
              type="tel"
              placeholder="+7 (XXX) XXX-XX-XX"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              onBlur={handleInputBlur('phone')}
              error={errors.phone}
            />
          </div>

          <div className="register-page__section">
            <h2 className="register-page__section-title">Профессиональный профиль</h2>

            <Select
              label="Уровень опыта по умолчанию"
              options={EXPERIENCE_OPTIONS}
              value={formData.experience_level}
              onChange={handleExperienceChange}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, experience_level: true }));
                setErrors((prev) => ({
                  ...prev,
                  experience_level: validateField('experience_level', formData.experience_level),
                }));
              }}
              error={errors.experience_level}
              placeholderLabel="Выберите уровень по умолчанию"
            />
            <p className="register-page__experience-hint">
              Необязательный уровень по умолчанию для технологий в стеке. Для отдельных технологий
              его можно изменить вручную.
            </p>

            <div className="register-page__stack-block">
              <div className="register-page__stack-label">Стек</div>

              <div className="register-page__stack-options">
                {TECHNOLOGY_OPTIONS.map((technology) => {
                  const isSelected = formData.stack.some((item) => item.name === technology);
                  return (
                    <button
                      key={technology}
                      type="button"
                      className={`register-page__stack-option ${isSelected ? 'register-page__stack-option--active' : ''}`}
                      onClick={() => toggleTechnology(technology)}
                    >
                      {technology}
                    </button>
                  );
                })}
              </div>

              <div className="register-page__stack-custom-row">
                <Input
                  label="Добавить технологию вручную"
                  type="text"
                  value={customTechnology}
                  onChange={(e) => setCustomTechnology(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomTechnology();
                    }
                  }}
                  placeholder="Например: Go"
                />
                <button
                  type="button"
                  className="register-page__stack-add"
                  onClick={addCustomTechnology}
                >
                  Добавить
                </button>
              </div>

              {formData.stack.length > 0 && (
                <div className="register-page__stack-selected">
                  {formData.stack.map((technology) => (
                    <div key={technology.name} className="register-page__stack-item">
                      <div className="register-page__stack-item-header">
                        <span className="register-page__stack-chip">{technology.name}</span>
                        <button
                          type="button"
                          className="register-page__stack-remove"
                          onClick={() => removeTechnology(technology.name)}
                          title="Удалить технологию"
                        >
                          x
                        </button>
                      </div>

                      <div className="register-page__stack-level-row">
                        <Select
                          label="Уровень"
                          options={EXPERIENCE_OPTIONS}
                          includePlaceholder={false}
                          value={technology.experience_level}
                          onChange={(e) =>
                            handleTechnologyLevelChange(
                              technology.name,
                              e.target.value as ExperienceLevel,
                            )
                          }
                        />
                        <button
                          type="button"
                          className="register-page__stack-level-reset"
                          onClick={() => resetTechnologyLevel(technology.name)}
                        >
                          По умолчанию (
                          {
                            EXPERIENCE_LABELS[
                              (formData.experience_level || 'junior') as ExperienceLevel
                            ]
                          }
                          )
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {errors.stack && <span className="register-page__field-error">{errors.stack}</span>}
            </div>
          </div>

          <div className="register-page__section">
            <h2 className="register-page__section-title">Рабочее расписание</h2>
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
          </div>

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
