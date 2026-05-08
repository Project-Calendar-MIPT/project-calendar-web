import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Loader } from "../components/ui/Loader";
import type { User, Task, WorkScheduleDay } from "../types";
import { apiClient } from "../api/client";
import { authService } from "../api/authService";
import "./ProfilePage.scss";

const DAY_NAMES: Record<number, string> = {
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
  7: "Воскресенье",
};

const formatStatusLabel = (status: Task["status"] | string) => {
  switch (status) {
    case "pending":
      return "Ожидает";
    case "in_progress":
      return "В работе";
    case "completed":
      return "Выполнено";
    case "cancelled":
      return "Отменено";
    default:
      return String(status);
  }
};

const getAllocatedHours = (task: Task): number => {
  const raw = (task as any).allocated_hours;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return task.estimated_hours || 0;
};

const getTaskUrgency = (task: Task): "overdue" | null => {
  if (!task.end_date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(task.end_date);
  endDate.setHours(0, 0, 0, 0);

  if (endDate < today) return "overdue";

  return null;
};

const formatUrgencyLabel = (urgency: "overdue" | null): string => {
  switch (urgency) {
    case "overdue":
      return "Просрочено";
    default:
      return "";
  }
};

const EXPERIENCE_LABELS: Record<string, string> = {
  junior: "Junior",
  middle: "Middle",
  senior: "Senior",
};

const formatStackLabel = (stack: User["stack"]): string => {
  if (!stack || stack.length === 0) return "—";

  return stack
    .map((item: any) => {
      if (typeof item === "string") {
        return item;
      }

      const level = item?.experience_level
        ? EXPERIENCE_LABELS[item.experience_level] || item.experience_level
        : "—";
      return `${item?.name || "—"} (${level})`;
    })
    .join(", ");
};

const DEFAULT_WORK_SCHEDULE: WorkScheduleDay[] = [
  {
    day_of_week: 1,
    is_working_day: true,
    start_time: "09:00",
    end_time: "18:00",
  },
  {
    day_of_week: 2,
    is_working_day: true,
    start_time: "09:00",
    end_time: "18:00",
  },
  {
    day_of_week: 3,
    is_working_day: true,
    start_time: "09:00",
    end_time: "18:00",
  },
  {
    day_of_week: 4,
    is_working_day: true,
    start_time: "09:00",
    end_time: "18:00",
  },
  {
    day_of_week: 5,
    is_working_day: true,
    start_time: "09:00",
    end_time: "18:00",
  },
  { day_of_week: 6, is_working_day: false },
  { day_of_week: 7, is_working_day: false },
];

async function loadProfileData(): Promise<{
  user: User;
  workSchedule: WorkScheduleDay[];
  tasks: Task[];
}> {
  const user = await authService.getCurrentUser();

  localStorage.setItem("current_user", JSON.stringify(user));

  const normalizeSchedule = (items: any[]): WorkScheduleDay[] => {
    return items.map((day) => ({
      day_of_week:
        day.day_of_week ??
        (typeof day.weekday === "number" ? day.weekday + 1 : 1),
      is_working_day:
        day.is_working_day ?? Boolean(day.start_time && day.end_time),
      start_time: day.start_time,
      end_time: day.end_time,
    }));
  };

  const normalizeTask = (raw: any): Task => ({
    ...raw,
    parent_task_id: raw.parent_task_id ?? null,
    description: raw.description ?? "",
    status: raw.status === "open" ? "pending" : raw.status,
    end_date: raw.due_date ?? raw.end_date ?? "",
    estimated_hours: raw.estimated_hours ? Number(raw.estimated_hours) : 0,
  });

  const [workScheduleResp, tasksResp] = await Promise.allSettled([
    apiClient.get<any[]>(`/users/${user.id}/work-schedule`),
    apiClient.get<any[]>("/tasks", { params: { assigned_to: "me" } }),
  ]);

  const workSchedule =
    workScheduleResp.status === "fulfilled" && workScheduleResp.value.data
      ? normalizeSchedule(workScheduleResp.value.data)
      : DEFAULT_WORK_SCHEDULE;

  const tasks =
    tasksResp.status === "fulfilled" && tasksResp.value.data
      ? tasksResp.value.data.map(normalizeTask)
      : [];

  return { user, workSchedule, tasks };
}

type ProfileTabId = "info" | "schedule" | "stats" | "projects" | "tasks" | "notifications";

const PROFILE_TABS: { id: ProfileTabId; label: string }[] = [
  { id: "info", label: "Профиль" },
  { id: "schedule", label: "Расписание" },
  { id: "stats", label: "Статистика" },
  { id: "projects", label: "Мои проекты" },
  { id: "tasks", label: "Мои задачи" },
  { id: "notifications", label: "Уведомления" },
];

interface NotificationSettings {
  deadline_reminders_enabled: boolean;
  reminder_days_before: number[];
  reminder_hours_before: number[];
}

const DAYS_OPTIONS = [1, 2, 3, 5, 7, 14];
const HOURS_OPTIONS = [1, 2, 3, 6, 12, 24];

const labelDay = (d: number) =>
  d === 1 ? "За 1 день" : d < 5 ? `За ${d} дня` : `За ${d} дней`;
const labelHour = (h: number) =>
  h === 1 ? "За 1 час" : h < 5 ? `За ${h} часа` : `За ${h} часов`;

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [workSchedule, setWorkSchedule] = useState<WorkScheduleDay[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<ProfileTabId>("info");

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    deadline_reminders_enabled: true,
    reminder_days_before: [1, 3, 7],
    reminder_hours_before: [],
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState<"ok" | "err" | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDataFromApi = async () => {
      try {
        setLoading(true);
        setError(null);

        const { user, workSchedule, tasks } = await loadProfileData();
        if (!isMounted) return;

        setUser(user);
        setWorkSchedule(workSchedule);
        setTasks(tasks);

        try {
          const ns = await apiClient.get<NotificationSettings>(
            `/users/${user.id}/notification-settings`,
          );
          if (isMounted && ns.data) setNotifSettings(ns.data);
        } catch {
          // default values are fine
        }
      } catch (e) {
        console.error(e);
        if (isMounted) {
          setError(
            "Не удалось загрузить данные профиля. Попробуйте обновить страницу.",
          );
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

  const toggleDay = (d: number) => {
    setNotifSettings((prev) => ({
      ...prev,
      reminder_days_before: prev.reminder_days_before.includes(d)
        ? prev.reminder_days_before.filter((x) => x !== d)
        : [...prev.reminder_days_before, d].sort((a, b) => a - b),
    }));
  };

  const toggleHour = (h: number) => {
    setNotifSettings((prev) => ({
      ...prev,
      reminder_hours_before: prev.reminder_hours_before.includes(h)
        ? prev.reminder_hours_before.filter((x) => x !== h)
        : [...prev.reminder_hours_before, h].sort((a, b) => a - b),
    }));
  };

  const saveNotifSettings = async () => {
    if (!user) return;
    setNotifSaving(true);
    setNotifFeedback(null);
    try {
      await apiClient.put(`/users/${user.id}/notification-settings`, notifSettings);
      setNotifFeedback("ok");
    } catch {
      setNotifFeedback("err");
    } finally {
      setNotifSaving(false);
      setTimeout(() => setNotifFeedback(null), 3000);
    }
  };

  const handleDayClick = (day: WorkScheduleDay) => {
    setSelectedDay(day.day_of_week);
  };

  const projectTasks = tasks.filter((t) => t.parent_task_id === null);
  const projectsCount = projectTasks.length;
  const activeTasksCount = tasks.filter(
    (t) => t.status === "in_progress",
  ).length;
  const completedTasksCount = tasks.filter(
    (t) => t.status === "completed",
  ).length;

  const totalAllocatedHours = tasks.reduce(
    (sum, t) => sum + getAllocatedHours(t),
    0,
  );

  const formattedTotalHours =
    totalAllocatedHours % 1 === 0
      ? totalAllocatedHours.toString()
      : totalAllocatedHours.toFixed(1);

  const projects = projectTasks;
  const sortedProjects = [...projects].sort((a, b) =>
    (a.title || "").localeCompare(b.title || "", "ru"),
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
    "?";

  const fullName = user
    ? [user.last_name, user.first_name, user.middle_name]
        .filter(Boolean)
        .join(" ")
    : "";
  const experienceLabel = user?.experience_level
    ? EXPERIENCE_LABELS[user.experience_level] || user.experience_level
    : "—";
  const stackLabel = formatStackLabel(user?.stack);
  const hasTelegram = Boolean(user?.telegram?.trim());
  const hasPhone = Boolean(user?.phone?.trim());

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
                <div className="profile-page__user-name">
                  {fullName || user.username}
                </div>
                <div className="profile-page__user-username">
                  @{user.username}
                </div>
              </div>
            </div>
          )}

          <nav className="profile-tabs" aria-label="Разделы профиля">
            {PROFILE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={
                  "profile-tabs__btn" +
                  (activeTab === tab.id ? " profile-tabs__btn--active" : "")
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
          {activeTab === "info" && user && (
            <Card
              className="profile-page__section"
              title="Информация о пользователе"
            >
              <div className="profile-info">
                <div className="profile-info__row">
                  <span className="profile-info__label">ФИО</span>
                  <span className="profile-info__value">{fullName || "—"}</span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Фамилия</span>
                  <span className="profile-info__value">
                    {user.last_name || "—"}
                  </span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Имя</span>
                  <span className="profile-info__value">
                    {user.first_name || "—"}
                  </span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Отчество</span>
                  <span className="profile-info__value">
                    {user.middle_name || "—"}
                  </span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Логин</span>
                  <span className="profile-info__value">@{user.username || '—'}</span>
                </div>
                {hasTelegram && (
                  <div className="profile-info__row">
                    <span className="profile-info__label">Telegram</span>
                    <span className="profile-info__value">{user.telegram}</span>
                  </div>
                )}
                {hasPhone && (
                  <div className="profile-info__row">
                    <span className="profile-info__label">Телефон</span>
                    <span className="profile-info__value">{user.phone}</span>
                  </div>
                )}
                <div className="profile-info__row">
                  <span className="profile-info__label">Email</span>
                  <span className="profile-info__value">
                    {user.email || "—"}
                  </span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Часовой пояс</span>
                  <span className="profile-info__value">
                    {user.timezone || "—"}
                  </span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Уровень опыта</span>
                  <span className="profile-info__value">{experienceLabel}</span>
                </div>
                <div className="profile-info__row">
                  <span className="profile-info__label">Стек</span>
                  <span className="profile-info__value">{stackLabel}</span>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "schedule" && (
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
                            "schedule-table__row" +
                            (isSelected ? " schedule-table__row--selected" : "")
                          }
                          onClick={() => handleDayClick(day)}
                        >
                          <td className="schedule-table__day">
                            {DAY_NAMES[day.day_of_week] ||
                              `День ${day.day_of_week}`}
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

          {activeTab === "stats" && (
            <Card className="profile-page__section" title="Статистика">
              {tasks.length === 0 ? (
                <p className="profile-empty">Нет задач для статистики</p>
              ) : (
                <div className="stats-grid">
                  <div className="stats-card">
                    <div className="stats-card__label">Проектов</div>
                    <div className="stats-card__value">{projectsCount}</div>
                    <div className="stats-card__hint">
                      Все верхнеуровневые задачи
                    </div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-card__label">Активных задач</div>
                    <div className="stats-card__value">{activeTasksCount}</div>
                    <div className="stats-card__hint">
                      Со статусом «В работе»
                    </div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-card__label">Завершённых задач</div>
                    <div className="stats-card__value">
                      {completedTasksCount}
                    </div>
                    <div className="stats-card__hint">Выполненные задачи</div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-card__label">Всего часов</div>
                    <div className="stats-card__value">
                      {formattedTotalHours}
                    </div>
                    <div className="stats-card__hint">
                      Сумма по всем задачам
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {activeTab === "projects" && (
            <Card className="profile-page__section" title="Мои проекты">
              {sortedProjects.length === 0 ? (
                <p className="profile-empty">Пока нет проектов</p>
              ) : (
                <ul className="projects-list">
                  {sortedProjects.map((p) => (
                    <li key={p.id} className="projects-list__item">
                      <div className="projects-list__header">
                        <span className="projects-list__title">{p.title}</span>
                        <span
                          className={`task-status-badge task-status-badge--${p.status}`}
                        >
                          {formatStatusLabel(p.status)}
                        </span>
                      </div>
                      {p.description && (
                        <p className="projects-list__description">
                          {p.description}
                        </p>
                      )}
                      <Link
                        className="projects-list__link"
                        to={`/projects/${p.id}`}
                      >
                        Открыть проект
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {activeTab === "tasks" && (
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
                          "task-list__item" +
                          (urgency ? ` task-list__item--${urgency}` : "")
                        }
                      >
                        <div className="task-list__main">
                          <span className="task-list__title">{t.title}</span>

                          <div className="task-list__badges">
                            {urgency && (
                              <span
                                className={`task-urgency-badge task-urgency-badge--${urgency}`}
                              >
                                {formatUrgencyLabel(urgency)}
                              </span>
                            )}

                            <span
                              className={`task-status-badge task-status-badge--${t.status}`}
                            >
                              {formatStatusLabel(t.status)}
                            </span>
                          </div>
                        </div>

                        {t.description && (
                          <p className="task-list__description">
                            {t.description}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="profile-page__section" title="Уведомления о дедлайнах">
              <div className={`notif-settings${!notifSettings.deadline_reminders_enabled ? " notif-settings--disabled" : ""}`}>
                <div className="notif-settings__toggle-row">
                  <label className="notif-settings__toggle">
                    <input
                      type="checkbox"
                      checked={notifSettings.deadline_reminders_enabled}
                      onChange={(e) =>
                        setNotifSettings((prev) => ({
                          ...prev,
                          deadline_reminders_enabled: e.target.checked,
                        }))
                      }
                    />
                    <span className="notif-settings__toggle-track" />
                  </label>
                  <span className="notif-settings__toggle-label">
                    Напоминания по email о приближающихся дедлайнах
                  </span>
                </div>

                <div className="notif-settings__group">
                  <div className="notif-settings__group-title">За сколько дней напомнить</div>
                  <div className="notif-settings__chips">
                    {DAYS_OPTIONS.map((d) => {
                      const active = notifSettings.reminder_days_before.includes(d);
                      return (
                        <label
                          key={d}
                          className={`notif-settings__chip${active ? " notif-settings__chip--active" : ""}`}
                        >
                          <input type="checkbox" checked={active} onChange={() => toggleDay(d)} />
                          {labelDay(d)}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="notif-settings__group">
                  <div className="notif-settings__group-title">За сколько часов напомнить</div>
                  <div className="notif-settings__chips">
                    {HOURS_OPTIONS.map((h) => {
                      const active = notifSettings.reminder_hours_before.includes(h);
                      return (
                        <label
                          key={h}
                          className={`notif-settings__chip${active ? " notif-settings__chip--active" : ""}`}
                        >
                          <input type="checkbox" checked={active} onChange={() => toggleHour(h)} />
                          {labelHour(h)}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="notif-settings__actions">
                  <button
                    type="button"
                    className="notif-settings__save-btn"
                    onClick={saveNotifSettings}
                    disabled={notifSaving}
                  >
                    {notifSaving ? "Сохраняем…" : "Сохранить"}
                  </button>
                  {notifFeedback === "ok" && (
                    <span className="notif-settings__feedback notif-settings__feedback--ok">
                      Настройки сохранены
                    </span>
                  )}
                  {notifFeedback === "err" && (
                    <span className="notif-settings__feedback notif-settings__feedback--err">
                      Не удалось сохранить
                    </span>
                  )}
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};
