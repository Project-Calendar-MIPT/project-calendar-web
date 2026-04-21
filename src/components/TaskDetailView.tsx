import React from "react";
import type { Task } from "../types";
import "./TaskDetailView.scss";

interface TaskDetailViewProps {
  task: Task;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: "Новая",
    in_progress: "В процессе",
    completed: "Завершена",
    cancelled: "Отменена",
  };
  return labels[status] || status;
};

const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    low: "Низкий",
    medium: "Средний",
    high: "Высокий",
    critical: "Критический",
  };
  return labels[priority] || priority;
};

const getComplexityLabel = (value?: string): string => {
  const labels: Record<string, string> = {
    low: "Низкая",
    medium: "Средняя",
    high: "Высокая",
  };
  return value ? labels[value] || value : "—";
};

const getNoveltyLabel = (value?: string): string => {
  const labels: Record<string, string> = {
    low: "Низкая",
    medium: "Средняя",
    high: "Высокая",
  };
  return value ? labels[value] || value : "—";
};

const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    critical: "#ef4444",
    high: "#f59e0b",
    medium: "#3b82f6",
    low: "#10b981",
  };
  return colors[priority] || "#6b7280";
};

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ task }) => {
  return (
    <div className="task-detail">
      <div className="task-detail__top">
        <div className="task-detail__title">{task.title}</div>

        <div className="task-detail__badges">
          <span className="task-detail__badge task-detail__badge--status">
            {getStatusLabel(task.status)}
          </span>

          <span
            className="task-detail__badge task-detail__badge--priority"
            style={{ backgroundColor: getPriorityColor(task.priority) }}
          >
            {getPriorityLabel(task.priority)}
          </span>
        </div>
      </div>

      <div className="task-detail__section">
        <div className="task-detail__section-title">Описание</div>
        <div className="task-detail__text">{task.description || "—"}</div>
      </div>

      <div className="task-detail__section">
        <div className="task-detail__section-title">Параметры</div>

        <div className="task-detail__kv">
          <div className="task-detail__k task-detail__k--with-info">
            <span>Сложность</span>
            <button
              type="button"
              className="task-detail__info-button"
              title="Сложность — насколько трудной является задача по объёму, координации и усилиям"
            >
              i
            </button>
          </div>
          <div className="task-detail__v">
            {getComplexityLabel(task.complexity)}
          </div>

          <div className="task-detail__k task-detail__k--with-info">
            <span>Новизна</span>
            <button
              type="button"
              className="task-detail__info-button"
              title="Новизна — насколько задача требует нового подхода, неизвестных решений или новых технологий"
            >
              i
            </button>
          </div>
          <div className="task-detail__v">{getNoveltyLabel(task.novelty)}</div>
        </div>
      </div>

      <div className="task-detail__section">
        <div className="task-detail__section-title">Сроки</div>

        <div className="task-detail__kv">
          <div className="task-detail__k">Дата начала</div>
          <div className="task-detail__v">{formatDate(task.start_date)}</div>

          <div className="task-detail__k">Дата окончания</div>
          <div className="task-detail__v">{formatDate(task.end_date)}</div>

          <div className="task-detail__k">Длительность (полных дней)</div>
          <div className="task-detail__v">{task.duration_days ?? "—"}</div>

          <div className="task-detail__k">Оценка часов</div>
          <div className="task-detail__v">{task.estimated_hours ?? 0}</div>
        </div>
      </div>
    </div>
  );
};
