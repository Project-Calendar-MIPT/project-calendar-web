import React, { useEffect, useMemo, useState } from 'react';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { UserSearch } from './UserSearch';
import type { Task, User } from '../types';
import { MOCK_USERS } from '../mock';
import { taskService } from '../api/taskService';
import { assignmentService } from '../minimal_test/api/assignmentService';
import './TaskForm.scss';

interface TaskFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  task?: Task;
  isProject?: boolean;
  projectStartDate?: string;
  projectEndDate?: string;
  projectId?: string;
}

type CandidateProfile = {
  user: User;
  activeTasks: Task[];
  overlappingTasks: Task[];
  matchedSkills: string[];
  relevanceScore: number;
  workloadLabel: string;
  isAvailable: boolean;
};

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

const normalizeRange = (start?: string, end?: string) => {
  if (!start && !end) {
    return null;
  }

  const normalizedStart = start || end || '';
  const normalizedEnd = end || start || '';

  if (!normalizedStart || !normalizedEnd) {
    return null;
  }

  return normalizedStart <= normalizedEnd
    ? { start: normalizedStart, end: normalizedEnd }
    : { start: normalizedEnd, end: normalizedStart };
};

const hasDateOverlap = (
  aStart?: string,
  aEnd?: string,
  bStart?: string,
  bEnd?: string
): boolean => {
  const first = normalizeRange(aStart, aEnd);
  const second = normalizeRange(bStart, bEnd);

  if (!first || !second) {
    return false;
  }

  return first.start <= second.end && second.start <= first.end;
};

const normalizeSkill = (value: string) => value.trim().toLowerCase();

const extractSkillsFromText = (text: string): string[] => {
  const normalized = text.toLowerCase();
  const map: Record<string, string[]> = {
    react: ['react', 'компонент', 'frontend', 'ui'],
    typescript: ['typescript', 'ts'],
    frontend: ['frontend', 'ui', 'modal', 'calendar'],
    backend: ['backend', 'api', 'service'],
    calendar: ['calendar', 'календар'],
    modal: ['modal', 'модаль'],
    testing: ['test', 'тест', 'qa'],
    api: ['api', 'интеграц'],
    auth: ['auth', 'jwt', 'аутентиф'],
    database: ['database', 'sql', 'бд'],
    security: ['security', 'безопас'],
    permissions: ['permission', 'role', 'разрешен'],
    schedule: ['schedule', 'расписан'],
    documentation: ['documentation', 'readme', 'документ'],
    ui: ['button', 'input', 'select', 'ui kit'],
  };

  return Object.entries(map)
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(([skill]) => skill);
};

export const TaskForm: React.FC<TaskFormProps> = ({
  onSubmit,
  onCancel,
  task,
  isProject = false,
  projectStartDate,
  projectEndDate,
  projectId,
}) => {
  const [formData, setFormData] = useState({
    is_public: false,
    title: task?.title || '',
    description: task?.description || '',
    start_date: task?.start_date || '',
    end_date: task?.end_date || '',
    duration_days: task?.duration_days || 0,
    priority: task?.priority || 'medium',
    estimated_hours: task?.estimated_hours || 0,
    complexity: task?.complexity || 'medium',
    novelty: task?.novelty || 'medium',
    assignee_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [lastChangedField, setLastChangedField] =
    useState<'start' | 'end' | 'duration' | null>(null);

  const [candidateProfiles, setCandidateProfiles] = useState<Record<string, CandidateProfile>>({});
  const [sortedCandidates, setSortedCandidates] = useState<User[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const hasDates = Boolean(formData.start_date || formData.end_date);

  const selectedProfile = useMemo(() => {
    if (!profileUserId) return null;
    return candidateProfiles[profileUserId] || null;
  }, [candidateProfiles, profileUserId]);

  const desiredSkills = useMemo(
    () => extractSkillsFromText(`${formData.title} ${formData.description}`),
    [formData.title, formData.description]
  );

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
    } else if (
      lastChangedField === 'duration' &&
      formData.start_date &&
      formData.duration_days >= 0
    ) {
      const newEndDate = addDaysToDate(formData.start_date, formData.duration_days);
      setFormData((prev) => ({ ...prev, end_date: newEndDate }));
    }
  }, [formData.start_date, formData.end_date, formData.duration_days, lastChangedField]);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentExecutor = async () => {
      if (!task?.id) return;

      try {
        const assignments = await taskService.getTaskAssignments(task.id);
        const executor = assignments.find((assignment: any) => assignment.role === 'executor');

        if (!cancelled && executor?.user_id) {
          setFormData((prev) => ({ ...prev, assignee_id: executor.user_id }));
        }
      } catch (err) {
        console.error('Ошибка при загрузке текущего исполнителя:', err);
      }
    };

    loadCurrentExecutor();

    return () => {
      cancelled = true;
    };
  }, [task?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadCandidates = async () => {
      if (isProject || !hasDates) {
        if (!cancelled) {
          setCandidateProfiles({});
          setSortedCandidates([]);
        }
        return;
      }

      try {
        setLoadingCandidates(true);

        const [allTasks, allAssignments] = await Promise.all([
          taskService.getTasks(),
          Promise.resolve(assignmentService.getMockAssignments()),
        ]);

        const projectMemberIds = projectId
          ? allAssignments
              .filter((assignment) => assignment.task_id === projectId)
              .map((assignment) => assignment.user_id)
          : [];

        const baseUsers =
          projectMemberIds.length > 0
            ? MOCK_USERS.filter((user) => projectMemberIds.includes(user.id))
            : MOCK_USERS;

        const profiles: Record<string, CandidateProfile> = {};
        const sorted = [...baseUsers]
          .map((user) => {
            const userAssignments = allAssignments.filter((assignment) => assignment.user_id === user.id);

            const activeTasks = userAssignments
              .map((assignment) => allTasks.find((item) => item.id === assignment.task_id))
              .filter((item): item is Task => Boolean(item))
              .filter(
                (item) =>
                  item.id !== task?.id &&
                  item.parent_task_id !== null &&
                  item.status !== 'completed' &&
                  item.status !== 'cancelled'
              );

            const overlappingTasks = activeTasks.filter((item) =>
              hasDateOverlap(
                formData.start_date,
                formData.end_date,
                item.start_date,
                item.end_date
              )
            );

            const userSkills = (user.skills || []).map(normalizeSkill);
            const matchedSkills = desiredSkills.filter((skill) => userSkills.includes(skill));
            const relevanceScore = matchedSkills.length;
            const isAvailable = overlappingTasks.length === 0;

            const profile: CandidateProfile = {
              user,
              activeTasks,
              overlappingTasks,
              matchedSkills,
              relevanceScore,
              workloadLabel: `${activeTasks.length} активн. задач`,
              isAvailable,
            };

            profiles[user.id] = profile;
            return profile;
          })
          .sort((a, b) => {
            if (a.isAvailable !== b.isAvailable) {
              return Number(b.isAvailable) - Number(a.isAvailable);
            }
            if (a.relevanceScore !== b.relevanceScore) {
              return b.relevanceScore - a.relevanceScore;
            }
            if (a.activeTasks.length !== b.activeTasks.length) {
              return a.activeTasks.length - b.activeTasks.length;
            }
            return a.user.full_name.localeCompare(b.user.full_name);
          })
          .map((profile) => profile.user);

        if (!cancelled) {
          setCandidateProfiles(profiles);
          setSortedCandidates(sorted);

          setFormData((prev) => {
            if (!prev.assignee_id) return prev;
            return profiles[prev.assignee_id]?.isAvailable ? prev : { ...prev, assignee_id: '' };
          });
        }
      } catch (err) {
        console.error('Ошибка при подборе кандидатов:', err);
      } finally {
        if (!cancelled) {
          setLoadingCandidates(false);
        }
      }
    };

    loadCandidates();

    return () => {
      cancelled = true;
    };
  }, [formData.start_date, formData.end_date, desiredSkills.join('|'), hasDates, isProject, projectId, task?.id]);

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

      case 'assignee_id':
        if (!isProject && hasDates && !value) {
          return 'При наличии дат нужно выбрать исполнителя';
        }
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

    if (touched.duration_days) {
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

    if (touched.estimated_hours) {
      const error = validateField('estimated_hours', safe);
      setErrors((prev) => ({ ...prev, estimated_hours: error }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isProject && !formData.description?.trim()) {
      setError('Описание проекта обязательно');
      return;
    }

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

    onSubmit({
      ...formData,
      assignee_id: hasDates ? formData.assignee_id : '',
    });
  };

  return (
    <>
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

        {isProject && (
          <div className="task-form__field">
            <label>Тип проекта</label>
            <div className="task-form__toggle">
              <button
                type="button"
                className={!formData.is_public ? 'active' : ''}
                onClick={() => setFormData({ ...formData, is_public: false })}
              >
                Приватный
              </button>
              <button
                type="button"
                className={formData.is_public ? 'active' : ''}
                onClick={() => setFormData({ ...formData, is_public: true })}
              >
                Публичный
              </button>
            </div>
          </div>
        )}

        {!isProject && hasDates && (
          <div className="task-form__assignee-block">
            <div className="task-form__skills-note">
              Подходящие навыки: {desiredSkills.length > 0 ? desiredSkills.join(', ') : 'не определены'}
            </div>

            <UserSearch
              users={sortedCandidates}
              candidateMeta={Object.fromEntries(
                Object.entries(candidateProfiles).map(([id, profile]) => [
                  id,
                  {
                    activeTasksCount: profile.activeTasks.length,
                    overlappingTasksCount: profile.overlappingTasks.length,
                    workloadLabel: profile.workloadLabel,
                    matchedSkills: profile.matchedSkills,
                    relevanceScore: profile.relevanceScore,
                    isAvailable: profile.isAvailable,
                  },
                ])
              )}
              onSelect={(user) => {
                setFormData((prev) => ({ ...prev, assignee_id: user.id }));
                if (touched.assignee_id) {
                  setErrors((prev) => ({ ...prev, assignee_id: '' }));
                }
              }}
              onPreview={(user) => setProfileUserId(user.id)}
            />

            <div className="task-form__availability-note">
              {loadingCandidates
                ? 'Подбираем кандидатов...'
                : sortedCandidates.length > 0
                  ? `Кандидатов найдено: ${sortedCandidates.length}`
                  : 'Нет кандидатов по текущим условиям'}
            </div>

            {formData.assignee_id && (
              <div className="task-form__selected-user">
                Выбран: {MOCK_USERS.find((u) => u.id === formData.assignee_id)?.full_name || '—'}
              </div>
            )}

            {errors.assignee_id && (
              <div className="task-form__field-error">{errors.assignee_id}</div>
            )}
          </div>
        )}

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
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, complexity: e.target.value as any }))
            }
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

      <Modal
        isOpen={!!selectedProfile}
        onClose={() => setProfileUserId(null)}
        title="Профиль кандидата"
        size="md"
      >
        {selectedProfile && (
          <div className="candidate-profile">
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">ФИО:</span>
              <span>{selectedProfile.user.full_name}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Ник:</span>
              <span>@{selectedProfile.user.username}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Email:</span>
              <span>{selectedProfile.user.email}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Навыки:</span>
              <span>{(selectedProfile.user.skills || []).join(', ') || 'Не указаны'}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Загруженность:</span>
              <span>{selectedProfile.workloadLabel}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Совпадение навыков:</span>
              <span>
                {selectedProfile.matchedSkills.length > 0
                  ? selectedProfile.matchedSkills.join(', ')
                  : 'Нет явных совпадений'}
              </span>
            </div>
            <div className="candidate-profile__row candidate-profile__row--top">
              <span className="candidate-profile__label">Активные задачи:</span>
              <div className="candidate-profile__tasks">
                {selectedProfile.activeTasks.length > 0 ? (
                  selectedProfile.activeTasks.map((item) => (
                    <div key={item.id} className="candidate-profile__task">
                      <strong>{item.title}</strong>
                      <span>
                        {item.start_date} — {item.end_date}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="candidate-profile__empty">Нет активных задач</span>
                )}
              </div>
            </div>
            {selectedProfile.overlappingTasks.length > 0 && (
              <div className="candidate-profile__warning">
                На выбранные даты у сотрудника есть пересечения по задачам.
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};
