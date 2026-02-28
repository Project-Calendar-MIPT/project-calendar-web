import { useEffect, useState, useCallback } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';

import { CalendarView } from '../components/CalendarView';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { TaskForm } from '../components/TaskForm';
import { Modal } from '../components/ui/Modal';
import { Loader } from '../components/ui/Loader';
import { Card } from '../components/ui/Card';

import { taskService } from '../api/taskService';
import type { CalendarEvent, Task } from '../types';
import { USE_MOCK } from '../mock';
import './CalendarPage.scss';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const [editProjectBounds, setEditProjectBounds] = useState<{ start?: string; end?: string }>({});

  const loadEvents = useCallback(async (start: Date, end: Date) => {
    if (USE_MOCK) {
      try {
        setLoading(true);
        setError(null);

        const allTasks = await taskService.getTasks();

        const filtered = allTasks.filter((t) => {
          const startDate = new Date(t.start_date);
          const endDate = new Date(t.end_date);
          return startDate >= start && endDate <= end;
        });

        const mapped: CalendarEvent[] = filtered.map((t) => ({
          id: t.id,
          title: t.title,
          start: new Date(t.start_date),
          end: new Date(t.end_date),
          resource: t,
        }));

        setEvents(mapped);
      } catch (e) {
        setError('Не удалось загрузить события календаря');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);
    } catch (e) {
      setError('Не удалось загрузить события календаря');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const now = new Date();
    loadEvents(startOfMonth(now), endOfMonth(now));
  }, [loadEvents]);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedTask(event.resource);
    setModalOpen(true);
  };

  const handleRangeChange = (range: unknown) => {
    if (Array.isArray(range)) {
      loadEvents(range[0], range[range.length - 1]);
    } else if (range && typeof range === 'object') {
      const r = range as { start: Date; end: Date };
      loadEvents(r.start, r.end);
    }
  };

  const loadProjectBoundsForTask = async (t: Task | null) => {
    try {
      if (!t) return {};
      let current: any = t;
      let guard = 0;

      while (current?.parent_task_id && guard < 20) {
        const parent = await (taskService as any).getTask?.(current.parent_task_id);
        if (!parent) break;
        current = parent;
        guard += 1;
      }

      return { start: current?.start_date, end: current?.end_date };
    } catch {
      return {};
    }
  };

  const handleEdit = async (taskId: string) => {
    try {
      const full = await (taskService as any).getTask?.(taskId);
      const toEdit = (full || selectedTask) as Task | null;

      setEditTask(toEdit);

      const bounds = await loadProjectBoundsForTask(toEdit);
      setEditProjectBounds(bounds);

      setEditOpen(true);
    } catch {
      // fallback
      setEditTask(selectedTask);
      const bounds = await loadProjectBoundsForTask(selectedTask);
      setEditProjectBounds(bounds);
      setEditOpen(true);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editTask) return;

    try {
      setLoading(true);
      setError(null);

      const updateFn = (taskService as any).updateTask;
      if (typeof updateFn !== 'function') {
        setError('В taskService нет updateTask(). Если скинешь taskService.ts — добавлю.');
        return;
      }

      await updateFn(editTask.id, data);

      // перезагрузка календаря
      const now = new Date();
      await loadEvents(startOfMonth(now), endOfMonth(now));

      setEditOpen(false);
      setEditTask(null);
      setEditProjectBounds({});
      setModalOpen(false);
      setSelectedTask(null);
    } catch (e) {
      setError('Не удалось обновить задачу');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      setLoading(true);
      setError(null);

      const deleteFn = (taskService as any).deleteTask;
      if (typeof deleteFn !== 'function') {
        setError('В taskService нет deleteTask(). Если скинешь taskService.ts — добавлю.');
        return;
      }

      await deleteFn(taskId);

      const now = new Date();
      await loadEvents(startOfMonth(now), endOfMonth(now));

      setModalOpen(false);
      setSelectedTask(null);
    } catch (e) {
      setError('Не удалось удалить задачу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '16px' }}>Календарь</h1>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <Loader size="lg" />
        </div>
      )}

      {error && (
        <Card className="error-card">
          <p>{error}</p>
        </Card>
      )}

      {!loading && !error && (
        <CalendarView
          events={events}
          onSelectEvent={handleSelectEvent}
          onRangeChange={handleRangeChange}
        />
      )}

      <TaskDetailModal
        task={selectedTask}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onEdit={(taskId) => handleEdit(taskId)}
        onDelete={(taskId) => handleDelete(taskId)}
      />

      <Modal
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditTask(null);
          setEditProjectBounds({});
        }}
        title="Редактирование задачи"
        size="md"
      >
        {editTask && (
          <TaskForm
            task={editTask}
            onSubmit={handleUpdate}
            onCancel={() => {
              setEditOpen(false);
              setEditTask(null);
              setEditProjectBounds({});
            }}
            projectStartDate={editProjectBounds.start}
            projectEndDate={editProjectBounds.end}
          />
        )}
      </Modal>
    </div>
  );
}
