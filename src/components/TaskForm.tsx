import React, { useState, useEffect } from 'react';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import type { Task } from '../types';
import './TaskForm.scss';

interface TaskFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  task?: Task;
  isProject?: boolean;
  projectStartDate?: string;
  projectEndDate?: string;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Низкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'high', label: 'Высокий' },
  { value: 'critical', label: 'Критический' },
];

const COMPLEXITY_OPTIONS = [
  { value: 'low', label: 'Низкая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'high', label: 'Высокая' },
];

const NOVELTY_OPTIONS = [
  { value: 'low', label: 'Низкая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'high', label: 'Высокая' },
];

const calculateDaysDiff = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
};

const addDaysToDate = (dateStr: string, days: number): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export const TaskForm: React.FC<TaskFormProps> = ({
  onSubmit,
  onCancel,
  task,
  isProject = false,
  projectStartDate,
  projectEndDate,
}) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    start_date: task?.start_date || '',
    end_date: task?.end_date || '',
    duration_days: task?.duration_days || 0,
    priority: task?.priority || 'medium',
    estimated_hours: task?.estimated_hours || 0,

    // ✅ новые необязательные поля
    complexity: task?.complexity || 'medium',
    novelty: task?.novelty || 'medium',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [lastChangedField, setLastChangedField] =
    useState<'start' | 'end' | 'duration' | null>(null);

  const isWithinProjectBounds = (date: string) => {
    if (!date) return true;
    if (projectStartDate && date < projectStartDate) return false;
    if (projectEndDate && date > projectEndDate) return false;
    return true;
  };

  useEffect(() => {
    if (lastChangedField === 'start' && formData.start_date && formData.duration_days > 0) {
      const newEndDate = addDaysToDate(formData.start_date, formData.duration_days);
      setFormData((prev) => ({ ...prev, end_date: newEndDate }));
    } else if (lastChangedField === 'end' && formData.start_date && formData.end_date) {
      const newDuration = calculateDaysDiff(formData.start_date, formData.end_date);
      setFormData((prev) => ({ ...prev, duration_days: newDuration }));
    } else if (lastChangedField === 'duration' && formData.start_date && formData.duration_days >= 0) {
      const newEndDate = addDaysToDate(formData.start_date, formData.duration_days);
      setFormData((prev) => ({ ...prev, end_date: newEndDate }));
    }
  }, [formData.start_date, formData.end_date, formData.duration_days, lastChangedField]);

  const validateField = (field: string, value: any): string => {
    switch (field) {
      case 'title':
        if (!value.trim()) return 'Название обязательно';
        return '';

      case 'description':
        if (!value.trim()) return 'Описание обязательно';
        return '';

      case 'start_date':
        if (value && formData.end_date && value > formData.end_date) {
          return 'Дата начала не может быть позже даты окончания';
        }
        if ((projectStartDate || projectEndDate) && value && !isWithinProjectBounds(value)) {
          return 'Дата начала выходит за пределы дат проекта';
        }
        return '';

      case 'end_date':
        if (value && formData.start_date && value < formData.start_date) {
          return 'Дата окончания не может быть раньше даты начала';
        }
        if ((projectStartDate || projectEndDate) && value && !isWithinProjectBounds(value)) {
          return 'Дата окончания выходит за пределы дат проекта';
        }
        return '';

      case 'estimated_hours':
        if (value < 0) return 'Количество часов не может быть отрицательным';
        return '';

      case 'duration_days':
        if (value < 0) return 'Длительность не может быть отрицательной';
        return '';

      default:
        return '';
    }
  };

  const handleInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setFormData({ ...formData, [field]: value });

      if (touched[field]) {
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    };

  const handleDateChange =
    (field: 'start_date' | 'end_date') => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData({ ...formData, [field]: value });
      setLastChangedField(field === 'start_date' ? 'start' : 'end');

      if (touched[field]) {
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    const safe = Math.max(0, value);
    setFormData({ ...formData, duration_days: safe });
    setLastChangedField('duration');

    if (touched['duration_days']) {
      const error = validateField('duration_days', safe);
      setErrors((prev) => ({ ...prev, duration_days: error }));
    }
  };

  const handleBlur = (field: string) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, (formData as any)[field]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = raw === '' ? 0 : Number(raw);
    const safe = Number.isFinite(num) ? Math.max(0, num) : 0;

    setFormData((prev) => ({ ...prev, estimated_hours: safe }));

    if (touched['estimated_hours']) {
      const error = validateField('estimated_hours', safe);
      setErrors((prev) => ({ ...prev, estimated_hours: error }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    (Object.keys(formData) as (keyof typeof formData)[]).forEach((field) => {
      const error = validateField(field, (formData as any)[field]);
      if (error) newErrors[field as string] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
      return;
    }

    onSubmit({ ...formData });
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <Input
        label="Название"
        type="text"
        value={formData.title}
        onChange={handleInputChange('title')}
        onBlur={handleBlur('title')}
        error={errors.title}
        required
      />

      <Input
        label="Описание"
        type="textarea"
        value={formData.description}
        onChange={handleInputChange('description')}
        onBlur={handleBlur('description')}
        error={errors.description}
        isTextarea
        required
      />

      <div className="task-form__date-group">
        <Input
          label="Дата начала"
          type="date"
          value={formData.start_date}
          onChange={handleDateChange('start_date')}
          onBlur={handleBlur('start_date')}
          error={errors.start_date}
        />

        <Input
          label="Длительность (дней)"
          type="number"
          value={formData.duration_days.toString()}
          onChange={handleDurationChange}
          onBlur={handleBlur('duration_days')}
          error={errors.duration_days}
          min="0"
          step="1"
        />

        <Input
          label="Дата окончания"
          type="date"
          value={formData.end_date}
          onChange={handleDateChange('end_date')}
          onBlur={handleBlur('end_date')}
          error={errors.end_date}
        />
      </div>

      {!isProject && (
        <Select
          label="Приоритет"
          options={PRIORITY_OPTIONS}
          value={formData.priority}
          includePlaceholder={false}
          onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value as any }))}
        />
      )}

      <div className="task-form__info-field">
        <div className="task-form__label-with-info">
          <span>Сложность</span>
          <button
            type="button"
            className="task-form__info-button"
            title="Сложность — насколько трудной является задача по объёму, координации и усилиям"
          >
            i
          </button>
        </div>

        <Select
          options={COMPLEXITY_OPTIONS}
          value={formData.complexity}
          includePlaceholder={false}
          onChange={(e) => setFormData((prev) => ({ ...prev, complexity: e.target.value as any }))}
        />
      </div>

      <div className="task-form__info-field">
        <div className="task-form__label-with-info">
          <span>Новизна</span>
          <button
            type="button"
            className="task-form__info-button"
            title="Новизна — насколько задача требует нового подхода, неизвестных решений или новых технологий"
          >
            i
          </button>
        </div>

        <Select
          options={NOVELTY_OPTIONS}
          value={formData.novelty}
          includePlaceholder={false}
          onChange={(e) => setFormData((prev) => ({ ...prev, novelty: e.target.value as any }))}
        />
      </div>

      <Input
        label="Ожидаемые часы"
        type="number"
        value={formData.estimated_hours.toString()}
        onChange={handleHoursChange}
        onBlur={handleBlur('estimated_hours')}
        error={errors.estimated_hours}
        min="0"
        step="1"
      />

      <div className="task-form__actions">
        <Button type="submit" variant="primary">
          Сохранить
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
};
