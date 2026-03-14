import React, { useState, useEffect } from 'react';
import { taskService } from '../api/taskService';
import type { Task } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import './TaskTree.scss';

interface TaskNodeProps {
  task: Task;
  level: number;
  onTaskClick: (task: Task) => void;
  onTaskDoubleClick: (task: Task) => void;
  selectedTaskId: string | null;
}

const TaskNode: React.FC<TaskNodeProps> = ({
  task,
  level,
  onTaskClick,
  onTaskDoubleClick,
  selectedTaskId,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [executorName, setExecutorName] = useState<string>('Не назначен');

  useEffect(() => {
    let cancelled = false;
    const loadExecutor = async () => {
      try {
        const [assignments, users] = await Promise.all([
          taskService.getTaskAssignments(task.id),
          taskService.getTaskUsers(task.id),
        ]);

        if (cancelled) return;

        const executorAssignment = assignments.find((a) => a.role === 'executor');

        if (!executorAssignment) {
          setExecutorName('Не назначен');
          return;
        }

        const executorUser = (users as any[]).find((u) => u.id === executorAssignment.user_id);

        if (!executorUser) {
          setExecutorName('Не назначен');
          return;
        }

        setExecutorName(
          executorUser.full_name ||
            executorUser.username ||
            executorUser.email ||
            'Не назначен'
        );
      } catch (err) {
        console.error('Ошибка при загрузке исполнителя задачи:', err);
        if (!cancelled) {
          setExecutorName('Не назначен');
        }
      }
    };

    loadExecutor();

    return () => {
      cancelled = true;
    };
  }, [task.id]);

  const handleExpand = async () => {
    if (!expanded) {
      setLoading(true);
      try {
        const data = await taskService.getSubtasks(task.id);
        setSubtasks(data);
      } catch (err) {
        console.error('Ошибка при загрузке подзадач:', err);
      }
      setLoading(false);
    }
    setExpanded(!expanded);
  };

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      critical: '#ef4444',
      high: '#f59e0b',
      medium: '#3b82f6',
      low: '#10b981',
    };
    return colors[priority] || '#6b7280';
  };

  const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
      critical: 'Критический',
      high: 'Высокий',
      medium: 'Средний',
      low: 'Низкий',
    };
    return labels[priority] || priority;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Новая',
      in_progress: 'В процессе',
      completed: 'Завершена',
      cancelled: 'Отменена',
    };
    return labels[status] || status;
  };

  const getClassificationLabel = (task: Task): string => {
    return Number(task.estimated_hours ?? 0) > 0
      ? 'С назначенным временем'
      : 'Без назначенного времени';
  };

  const isSelected = task.id === selectedTaskId;

  return (
    <div className="task-node" style={{ marginLeft: `${level * 20}px` }}>
      <div className={`task-node__content ${isSelected ? 'task-node__content--selected' : ''}`}>
        <button
          className={`task-node__expand ${expanded ? 'task-node__expand--open' : ''}`}
          onClick={handleExpand}
          disabled={loading}
        >
          {loading ? '⌛' : '▶'}
        </button>

        <div
          className="task-node__info"
          onClick={() => onTaskClick(task)}
          onDoubleClick={() => onTaskDoubleClick(task)}
        >
          <div className="task-node__title-row">
            <span className="task-node__title">{task.title}</span>

            <span className="task-node__status">{getStatusLabel(task.status)}</span>

            <span
              className="task-node__priority"
              style={{ backgroundColor: getPriorityColor(task.priority) }}
            >
              {getPriorityLabel(task.priority)}
            </span>
          </div>

          <div className="task-node__meta-row">
            <span className="task-node__classification">
              {getClassificationLabel(task)}
            </span>
            <span className="task-node__executor">Исполнитель: {executorName}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="task-node__children">
          {subtasks.length > 0 ? (
            subtasks.map((subtask) => (
              <TaskNode
                key={subtask.id}
                task={subtask}
                level={level + 1}
                onTaskClick={onTaskClick}
                onTaskDoubleClick={onTaskDoubleClick}
                selectedTaskId={selectedTaskId}
              />
            ))
          ) : (
            <div className="task-node__empty">Нет подзадач</div>
          )}
        </div>
      )}
    </div>
  );
};

interface TaskTreeProps {
  taskId: string;
  onTaskSelect?: (task: Task | null) => void;
  onAddSubtask?: (parentTask: Task) => void;
}

export const TaskTree: React.FC<TaskTreeProps> = ({ taskId, onTaskSelect, onAddSubtask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
  }, [taskId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await taskService.getSubtasks(taskId);
      setTasks(data);
    } catch (err) {
      console.error('Ошибка при загрузке дерева задач:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    const newSelectedTask = selectedTask?.id === task.id ? null : task;
    setSelectedTask(newSelectedTask);
    onTaskSelect?.(newSelectedTask);
  };

  const handleTaskDoubleClick = (task: Task) => {
    setDetailTask(task);
  };

  if (loading) {
    return <div className="task-tree">Загрузка...</div>;
  }

  return (
    <div className="task-tree">
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <TaskNode
            key={task.id}
            task={task}
            level={0}
            onTaskClick={handleTaskClick}
            onTaskDoubleClick={handleTaskDoubleClick}
            selectedTaskId={selectedTask?.id || null}
          />
        ))
      ) : (
        <div className="task-tree__empty">Нет задач</div>
      )}

      {selectedTask && (
        <div className="task-tree__selected">
          <strong>Выбрана задача:</strong> {selectedTask.title}

          {onAddSubtask && (
            <button
              onClick={() => onAddSubtask(selectedTask)}
              className="task-tree__deselect"
              style={{ marginLeft: 12 }}
              title="Добавить подзадачу"
            >
              + Подзадача
            </button>
          )}

          <button onClick={() => handleTaskClick(selectedTask)} className="task-tree__deselect">
            ✕
          </button>
        </div>
      )}

      <TaskDetailModal
        task={detailTask}
        isOpen={!!detailTask}
        onClose={() => setDetailTask(null)}
      />
    </div>
  );
};
