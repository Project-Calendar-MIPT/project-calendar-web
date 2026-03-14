import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import type { User, Task, WorkScheduleDay } from '../types';
import { apiClient } from '../api/client';
import { authService } from '../api/authService';
import { taskService } from '../api/taskService';
import { assignmentService } from '../minimal_test/api/assignmentService';
import { getTasksByUserId, getProjectsByUserId } from '../mock';
import { USE_MOCK } from '../mock';
import './ProfilePage.scss';

const DAY_NAMES: Record<number, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
  7: 'Воскресенье',
};

const formatStatusLabel = (status: Task['status'] | string) => {
  switch (status) {
    case 'pending':
      return 'Ожидает';
    case 'in_progress':
      return 'В работе';
    case 'completed':
      return 'Выполнено';
    case 'cancelled':
      return 'Отменено';
    default:
      return String(status);
  }
};

const getAllocatedHours = (task: Task): number => {
  const raw = (task as any).allocated_hours;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return task.estimated_hours || 0;
};

const getTaskUrgency = (task: Task): 'overdue' | null => {
  if (!task.end_date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(task.end_date);
  endDate.setHours(0, 0, 0, 0);

  if (endDate < today) return 'overdue';

  return null;
};

const formatUrgencyLabel = (urgency: 'overdue' | null): string => {
  switch (urgency) {
    case 'overdue':
      return 'Просрочено';
    default:
      return '';
  }
};

const DEFAULT_WORK_SCHEDULE: WorkScheduleDay[] = [
  { day_of_week: 1, is_working_day: true, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 2, is_working_day: true, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 3, is_working_day: true, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 4, is_working_day: true, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 5, is_working_day: true, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 6, is_working_day: false },
  { day_of_week: 7, is_working_day: false },
];

async function fakeLoadProfileData(): Promise<{
  user: User;
  workSchedule: WorkScheduleDay[];
  tasks: Task[];
}> {
  const user = await authService.getCurrentUser();
  const allTasks = await taskService.getTasks();
  const userAssignments = assignmentService.getMockAssignments().filter((a) => a.user_id === user.id);
  const userTaskIds = userAssignments.map((a) => a.task_id);
  const tasks = allTasks.filter((t) => userTaskIds.includes(t.id));

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        user,
        workSchedule: DEFAULT_WORK_SCHEDULE,
        tasks,
      });
    }, 300);
  });
}

type ProfileTabId = 'info' | 'schedule' | 'stats' | 'projects' | 'tasks';

const PROFILE_TABS: { id: ProfileTabId; label: string }[] = [
  { id: 'info', label: 'Профиль' },
  { id: 'schedule', label: 'Расписание' },
  { id: 'stats', label: 'Статистика' },
  { id: 'projects', label: 'Мои проекты' },
  { id: 'tasks', label: 'Мои задачи' },
];

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [workSchedule, setWorkSchedule] = useState<WorkScheduleDay[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<ProfileTabId>('info');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDataFromApi = async () => {
      try {
        setLoading(true);
        setError(null);

        if (USE_MOCK) {
          const { user, workSchedule, tasks } = await fakeLoadProfileData();
          if (!isMounted) return;

          setUser(user);
          setWorkSchedule(workSchedule);
          setTasks(tasks);
        } else {
          const meResp = await apiClient.get<User>('/auth/me');
          if (!isMounted) return;
          const currentUser = meResp.data;
          setUser(currentUser);

          const [scheduleResp, tasksResp] = await Promise.all([
            apiClient.get<WorkScheduleDay[]>(`/users/${currentUser.id}/work-schedule`),
            apiClient.get<Task[]>('/tasks', {
              params: { assigned_to: 'me' },
            }),
          ]);

          if (!isMounted) return;

          setWorkSchedule(scheduleResp.data || []);
          setTasks(tasksResp.data || []);
        }
      } catch (e) {
        console.error(e);
        if (isMounted) {
          setError('Не удалось загрузить данные профиля. Попробуйте обновить страницу.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDataFromApi();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDayClick = (day: WorkScheduleDay) => {
    setSelectedDay(day.day_of_week);
  };

  const projectTasks = tasks.filter((t) => t.parent_task_id === null);
  const projectsCount = projectTasks.length;
  const activeTasksCount = tasks.filter((t) => t.status === 'in_progress').length;
  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;

  const totalAllocatedHours = tasks.reduce((sum, t) => sum + getAllocatedHours(t), 0);

  const formattedTotalHours =
    totalAllocatedHours % 1 === 0 ? totalAllocatedHours.toString() : totalAllocatedHours.toFixed(1);

  const projects = projectTasks;
  const sortedProjects = [...projects].sort((a, b) =>
    (a.title || '').localeCompare(b.title || '', 'ru'),
  );

  if (loading) {
    return (
      <div className="profile-page profile-page--loading">
        <Loader size="lg" text="Загружаем профиль..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <h1 className="profile-page__title">Профиль</h1>
        <Card className="profile-page__error">
          <p>{error}</p>
        </Card>
      </div>
    );
  }

  const avatarLetter =
    (user?.last_name && user.last_name.trim()[0]) ||
    (user?.first_name && user.first_name.trim()[0]) ||
    (user?.username && user.username.trim()[0]) ||
    '?';

  const fullName = user
    ? [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ')
    : '';

  return (
    <div className="profile-page">
      <h1 className="profile-page__title">Профиль</h1>

      <div className="profile-page__layout">
        <aside className="profile-page__sidebar">
          {user && (
            <div className="profile-page__user">
              <div className="profile-page__avatar" aria-hidden="true">
                {avatarLetter.toUpperCase()}
              </div>
              <div className="profile-page__user-meta">
                <div className="profile-page__user-name">{fullName || user.username}</div>
                <div className="profile-page__user-username">@{user.username}</div>
              </div>
            </div>
          )}

          <nav className="profile-tabs" aria-label="Разделы профиля">
            {PROFILE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={
                  'profile-tabs__btn' + (activeTab === tab.id ? ' profile-tabs__btn--active' : '')
                }
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="profile-tabs__bullet" />
                <span className="profile-tabs__label">{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="profile-page__content">
          {activeTab === 'info' && user && (
            <Card className="profile-page__section" title="Информация о пользователе">
              <div className="profile-info">
                <div className="profile-info__row">
                  <span className="profile-info__label">ФИО</span>
                  <span className="profile-info__value">{fullName || '—'}</span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Фамилия</span>
                  <span className="profile-info__value">{user.last_name || '—'}</span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Имя</span>
                  <span className="profile-info__value">{user.first_name || '—'}</span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Отчество</span>
                  <span className="profile-info__value">{user.middle_name || '—'}</span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Username</span>
                  <span className="profile-info__value">@{user.username || '—'}</span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Telegram</span>
                  <span className="profile-info__value">{user.telegram || '—'}</span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Телефон</span>
                  <span className="profile-info__value">{user.phone || '—'}</span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Видимость контактов</span>
                  <span className="profile-info__value">{user.contacts_visible ? 'Видимы' : 'Скрыты'}</span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Email</span>
                  <span className="profile-info__value">{user.email || '—'}</span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Часовой пояс</span>
                  <span className="profile-info__value">{user.timezone || '—'}</span>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'schedule' && (
            <Card className="profile-page__section" title="Рабочее расписание">
              {workSchedule.length === 0 ? (
                <p className="profile-empty">Расписание не задано</p>
              ) : (
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th>День</th>
                      <th>Время</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workSchedule.map((day) => {
                      const isSelected = selectedDay === day.day_of_week;
                      return (
                        <tr
                          key={day.day_of_week}
                          className={
                            'schedule-table__row' +
                            (isSelected ? ' schedule-table__row--selected' : '')
                          }
                          onClick={() => handleDayClick(day)}
                        >
                          <td className="schedule-table__day">
                            {DAY_NAMES[day.day_of_week] || `День ${day.day_of_week}`}
                          </td>
                          <td className="schedule-table__time">
                            {day.is_working_day ? (
                              <span className="schedule-table__badge schedule-table__badge--work">
                                {day.start_time} — {day.end_time}
                              </span>
                            ) : (
                              <span className="schedule-table__badge schedule-table__badge--off">
                                Выходной
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {activeTab === 'stats' && (
            <Card className="profile-page__section" title="Статистика">
              {tasks.length === 0 ? (
                <p className="profile-empty">Нет задач для статистики</p>
              ) : (
                <div className="stats-grid">
                  <div className="stats-card">
                    <div className="stats-card__label">Проектов</div>
                    <div className="stats-card__value">{projectsCount}</div>
                    <div className="stats-card__hint">Все верхнеуровневые задачи</div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-card__label">Активных задач</div>
                    <div className="stats-card__value">{activeTasksCount}</div>
                    <div className="stats-card__hint">Со статусом «В работе»</div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-card__label">Завершённых задач</div>
                    <div className="stats-card__value">{completedTasksCount}</div>
                    <div className="stats-card__hint">Выполненные задачи</div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-card__label">Всего часов</div>
                    <div className="stats-card__value">{formattedTotalHours}</div>
                    <div className="stats-card__hint">Сумма по всем задачам</div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'projects' && (
            <Card className="profile-page__section" title="Мои проекты">
              {sortedProjects.length === 0 ? (
                <p className="profile-empty">Пока нет проектов</p>
              ) : (
                <ul className="projects-list">
                  {sortedProjects.map((p) => (
                    <li key={p.id} className="projects-list__item">
                      <div className="projects-list__header">
                        <span className="projects-list__title">{p.title}</span>
                        <span className={`task-status-badge task-status-badge--${p.status}`}>
                          {formatStatusLabel(p.status)}
                        </span>
                      </div>
                      {p.description && (
                        <p className="projects-list__description">{p.description}</p>
                      )}
                      <a className="projects-list__link" href={`/projects/${p.id}`}>
                        Открыть проект
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {activeTab === 'tasks' && (
            <Card className="profile-page__section" title="Мои задачи">
              {tasks.length === 0 ? (
                <p className="profile-empty">Пока нет задач</p>
              ) : (
                <ul className="task-list">
                  {tasks.map((t) => {
                    const urgency = getTaskUrgency(t);

                    return (
                      <li
                        key={t.id}
                        className={
                          'task-list__item' +
                          (urgency ? ` task-list__item--${urgency}` : '')
                        }
                      >
                        <div className="task-list__main">
                          <span className="task-list__title">{t.title}</span>

                          <div className="task-list__badges">
                            {urgency && (
                              <span className={`task-urgency-badge task-urgency-badge--${urgency}`}>
                                {formatUrgencyLabel(urgency)}
                              </span>
                            )}

                            <span className={`task-status-badge task-status-badge--${t.status}`}>
                              {formatStatusLabel(t.status)}
                            </span>
                          </div>
                        </div>

                        {t.description && <p className="task-list__description">{t.description}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};
