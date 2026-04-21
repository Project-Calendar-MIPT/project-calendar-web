import React, { useEffect, useMemo, useState } from "react";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import type { Task, User } from "../types";
import { taskService } from "../api/taskService";
import { assignmentService } from "../api/assignmentService";
import { apiClient } from "../api/client";
import "./TaskForm.scss";

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
};

const PRIORITY_OPTIONS = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "high", label: "Высокий" },
  { value: "critical", label: "Критический" },
];

const COMPLEXITY_OPTIONS = [
  { value: "low", label: "Низкая" },
  { value: "medium", label: "Средняя" },
  { value: "high", label: "Высокая" },
];

const NOVELTY_OPTIONS = [
  { value: "low", label: "Низкая" },
  { value: "medium", label: "Средняя" },
  { value: "high", label: "Высокая" },
];

const calculateDaysDiff = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
};

const addDaysToDate = (dateStr: string, days: number): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  date.setDate(date.getDate() + Math.max(0, days - 1));
  return date.toISOString().split("T")[0];
};

const normalizeRange = (start?: string, end?: string) => {
  if (!start && !end) {
    return null;
  }

  const normalizedStart = start || end || "";
  const normalizedEnd = end || start || "";

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
  bEnd?: string,
): boolean => {
  const first = normalizeRange(aStart, aEnd);
  const second = normalizeRange(bStart, bEnd);

  if (!first || !second) {
    return false;
  }

  return first.start <= second.end && second.start <= first.end;
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
  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    start_date: task?.start_date || today,
    end_date: task?.end_date || today,
    duration_days: task?.duration_days || 1,
    priority: task?.priority || "medium",
    estimated_hours: task?.estimated_hours || 0,
    complexity: task?.complexity || "medium",
    novelty: task?.novelty || "medium",
    assignee_id: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [lastChangedField, setLastChangedField] = useState<
    "start" | "end" | "duration" | null
  >(null);

  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [candidateProfiles, setCandidateProfiles] = useState<
    Record<string, CandidateProfile>
  >({});
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const hasDates = Boolean(formData.start_date || formData.end_date);

  const selectedProfile = useMemo(() => {
    if (!profileUserId) return null;
    return candidateProfiles[profileUserId] || null;
  }, [candidateProfiles, profileUserId]);

  const isWithinProjectBounds = (date: string) => {
    if (!date) return true;
    if (projectStartDate && date < projectStartDate) return false;
    if (projectEndDate && date > projectEndDate) return false;
    return true;
  };

  useEffect(() => {
    if (
      lastChangedField === "start" &&
      formData.start_date &&
      formData.duration_days >= 1
    ) {
      const newEndDate = addDaysToDate(
        formData.start_date,
        formData.duration_days,
      );
      setFormData((prev) => ({ ...prev, end_date: newEndDate }));
    } else if (
      lastChangedField === "end" &&
      formData.start_date &&
      formData.end_date
    ) {
      const newDuration = calculateDaysDiff(
        formData.start_date,
        formData.end_date,
      );
      setFormData((prev) => ({ ...prev, duration_days: newDuration }));
    } else if (
      lastChangedField === "duration" &&
      formData.start_date &&
      formData.duration_days >= 1
    ) {
      const newEndDate = addDaysToDate(
        formData.start_date,
        formData.duration_days,
      );
      setFormData((prev) => ({ ...prev, end_date: newEndDate }));
    }
  }, [
    formData.start_date,
    formData.end_date,
    formData.duration_days,
    lastChangedField,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentExecutor = async () => {
      if (!task?.id) return;

      try {
        const assignments = await taskService.getTaskAssignments(task.id);
        const executor = assignments.find(
          (assignment: any) => assignment.role === "executor",
        );

        if (!cancelled && executor?.user_id) {
          setFormData((prev) => ({ ...prev, assignee_id: executor.user_id }));
        }
      } catch (err) {
        console.error("Ошибка при загрузке текущего исполнителя:", err);
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
          setAvailableUsers([]);
          setCandidateProfiles({});
        }
        return;
      }

      try {
        setLoadingCandidates(true);

        const [allTasks, projectAssignments] = await Promise.all([
          taskService.getTasks(),
          projectId
            ? assignmentService.getAssignments(projectId)
            : Promise.resolve([]),
        ]);

        const projectMemberIds = projectAssignments.map((a) => a.user_id);

        // Fetch real user objects for project members
        const memberUsersRaw = await Promise.all(
          projectMemberIds.map(async (uid) => {
            try {
              const resp = await apiClient.get<any>(`/users/${uid}`);
              const u = resp.data;
              return {
                id: uid,
                username: u.display_name ?? u.email ?? "",
                email: u.email ?? "",
                first_name: u.name ?? "",
                last_name: u.surname ?? "",
                timezone: u.timezone ?? "Europe/Moscow",
                contacts_visible: true,
              } as User;
            } catch {
              return null;
            }
          }),
        );
        const baseUsers = memberUsersRaw.filter(Boolean) as User[];

        const nextProfiles: Record<string, CandidateProfile> = {};
        const nextAvailableUsers: User[] = [];

        // Collect all assignments across project tasks
        const allAssignmentsForProject: typeof projectAssignments = [
          ...projectAssignments,
        ];
        for (const t of allTasks.filter(
          (t) => projectMemberIds.length > 0 || t.parent_task_id,
        )) {
          try {
            const ta = await assignmentService.getAssignments(t.id);
            allAssignmentsForProject.push(...ta);
          } catch {
            /* skip */
          }
        }

        for (const user of baseUsers) {
          const userAssignments = allAssignmentsForProject.filter(
            (assignment) => assignment.user_id === user.id,
          );

          const activeTasks = userAssignments
            .map((assignment) =>
              allTasks.find((item) => item.id === assignment.task_id),
            )
            .filter((item): item is Task => Boolean(item))
            .filter(
              (item) =>
                item.id !== task?.id &&
                item.parent_task_id !== null &&
                item.status !== "completed" &&
                item.status !== "cancelled",
            );

          const overlappingTasks = activeTasks.filter((item) =>
            hasDateOverlap(
              formData.start_date,
              formData.end_date,
              item.start_date,
              item.end_date,
            ),
          );

          nextProfiles[user.id] = {
            user,
            activeTasks,
            overlappingTasks,
          };

          if (overlappingTasks.length === 0) {
            nextAvailableUsers.push(user);
          }
        }

        if (!cancelled) {
          setCandidateProfiles(nextProfiles);
          setAvailableUsers(nextAvailableUsers);

          setFormData((prev) => {
            if (!prev.assignee_id) return prev;
            const stillAvailable = nextAvailableUsers.some(
              (user) => user.id === prev.assignee_id,
            );
            return stillAvailable ? prev : { ...prev, assignee_id: "" };
          });
        }
      } catch (err) {
        console.error("Ошибка при подборе доступных сотрудников:", err);
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
  }, [
    formData.start_date,
    formData.end_date,
    hasDates,
    isProject,
    projectId,
    task?.id,
  ]);

  const validateField = (field: string, value: any): string => {
    switch (field) {
      case "title":
        if (!value.trim()) return "Название обязательно";
        return "";

      case "description":
        if (!value.trim()) return "Описание обязательно";
        return "";

      case "start_date":
        if (value && formData.end_date && value > formData.end_date) {
          return "Дата начала не может быть позже даты окончания";
        }
        if (
          (projectStartDate || projectEndDate) &&
          value &&
          !isWithinProjectBounds(value)
        ) {
          return "Дата начала выходит за пределы дат проекта";
        }
        return "";

      case "end_date":
        if (value && formData.start_date && value < formData.start_date) {
          return "Дата окончания не может быть раньше даты начала";
        }
        if (
          (projectStartDate || projectEndDate) &&
          value &&
          !isWithinProjectBounds(value)
        ) {
          return "Дата окончания выходит за пределы дат проекта";
        }
        return "";

      case "estimated_hours":
        if (value < 0) return "Количество часов не может быть отрицательным";
        return "";

      case "duration_days":
        if (value < 1) return "Длительность должна быть не менее 1 дня";
        return "";

      case "assignee_id":
        if (!isProject && hasDates && !value) {
          return "При наличии дат нужно выбрать исполнителя";
        }
        return "";

      default:
        return "";
    }
  };

  const handleInputChange =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setFormData({ ...formData, [field]: value });

      if (touched[field]) {
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    };

  const handleDateChange =
    (field: "start_date" | "end_date") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData({ ...formData, [field]: value });
      setLastChangedField(field === "start_date" ? "start" : "end");

      if (touched[field]) {
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }

      if (touched.assignee_id) {
        const error = validateField("assignee_id", formData.assignee_id);
        setErrors((prev) => ({ ...prev, assignee_id: error }));
      }
    };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    const safe = Math.max(1, value);
    setFormData({ ...formData, duration_days: safe });
    setLastChangedField("duration");

    if (touched.duration_days) {
      const error = validateField("duration_days", safe);
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
    const num = raw === "" ? 0 : Number(raw);
    const safe = Number.isFinite(num) ? Math.max(0, num) : 0;

    setFormData((prev) => ({ ...prev, estimated_hours: safe }));

    if (touched.estimated_hours) {
      const error = validateField("estimated_hours", safe);
      setErrors((prev) => ({ ...prev, estimated_hours: error }));
    }
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, assignee_id: value }));

    if (touched.assignee_id) {
      const error = validateField("assignee_id", value);
      setErrors((prev) => ({ ...prev, assignee_id: error }));
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
      setTouched(
        Object.keys(formData).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {},
        ),
      );
      return;
    }

    onSubmit({
      ...formData,
      assignee_id: hasDates ? formData.assignee_id : "",
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="task-form">
        <Input
          label="Название"
          type="text"
          value={formData.title}
          onChange={handleInputChange("title")}
          onBlur={handleBlur("title")}
          error={errors.title}
          required
        />

        <Input
          label="Описание"
          type="textarea"
          value={formData.description}
          onChange={handleInputChange("description")}
          onBlur={handleBlur("description")}
          error={errors.description}
          isTextarea
          required
        />

        <div className="task-form__date-group">
          <Input
            label="Дата начала"
            type="date"
            value={formData.start_date}
            onChange={handleDateChange("start_date")}
            onBlur={handleBlur("start_date")}
            error={errors.start_date}
          />

          <Input
            label="Длительность (полных дней)"
            type="number"
            value={formData.duration_days.toString()}
            onChange={handleDurationChange}
            onBlur={handleBlur("duration_days")}
            error={errors.duration_days}
            min="1"
            step="1"
          />

          <Input
            label="Дата окончания"
            type="date"
            value={formData.end_date}
            onChange={handleDateChange("end_date")}
            onBlur={handleBlur("end_date")}
            error={errors.end_date}
          />
        </div>

        {!isProject && hasDates && (
          <div className="task-form__assignee-block">
            <Select
              label="Исполнитель"
              options={availableUsers.map((user) => ({
                value: user.id,
                label:
                  [user.last_name, user.first_name].filter(Boolean).join(" ") ||
                  user.username ||
                  user.email,
              }))}
              value={formData.assignee_id}
              onChange={handleAssigneeChange}
              error={errors.assignee_id}
              required
            />

            <div className="task-form__availability-note">
              {loadingCandidates
                ? "Подбираем доступных сотрудников..."
                : availableUsers.length > 0
                  ? `Доступно сотрудников: ${availableUsers.length}`
                  : "Нет свободных сотрудников на выбранный период"}
            </div>

            <div className="task-form__candidate-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProfileUserId(formData.assignee_id)}
                disabled={!formData.assignee_id}
              >
                Профиль кандидата
              </Button>
            </div>
          </div>
        )}

        {!isProject && (
          <Select
            label="Приоритет"
            options={PRIORITY_OPTIONS}
            value={formData.priority}
            includePlaceholder={false}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                priority: e.target.value as any,
              }))
            }
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
              setFormData((prev) => ({
                ...prev,
                complexity: e.target.value as any,
              }))
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
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                novelty: e.target.value as any,
              }))
            }
          />
        </div>

        <Input
          label="Ожидаемые часы"
          type="number"
          value={formData.estimated_hours.toString()}
          onChange={handleHoursChange}
          onBlur={handleBlur("estimated_hours")}
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
              <span>
                {[
                  selectedProfile.user.last_name,
                  selectedProfile.user.first_name,
                ]
                  .filter(Boolean)
                  .join(" ") || selectedProfile.user.username}
              </span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Логин:</span>
              <span>{selectedProfile.user.username}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Email:</span>
              <span>{selectedProfile.user.email}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Часовой пояс:</span>
              <span>{selectedProfile.user.timezone}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Стек:</span>
              <span>Не указан в текущих данных</span>
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
                  <span className="candidate-profile__empty">
                    Нет активных задач
                  </span>
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
