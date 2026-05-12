import { useEffect, useState, useCallback } from "react";
import { startOfMonth, endOfMonth } from "date-fns";

import { CalendarView } from "../components/CalendarView";
import { TaskDetailModal } from "../components/TaskDetailModal";
import { TaskForm } from "../components/TaskForm";
import { Modal } from "../components/ui/Modal";
import { Loader } from "../components/ui/Loader";
import { Card } from "../components/ui/Card";

import { taskService } from "../api/taskService";
import { meetingService, type Meeting } from "../api/meetingService";
import { authService } from "../api/authService";
import type { CalendarEvent, Task } from "../types";
import "./CalendarPage.scss";

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const [editProjectBounds, setEditProjectBounds] = useState<{
    start?: string;
    end?: string;
  }>({});

  const loadEvents = useCallback(async (start: Date, end: Date) => {
    try {
      setLoading(true);
      setError(null);

      const [allTasks, currentUser, meetings] = await Promise.all([
        taskService.getTasks(),
        authService.getCurrentUser().catch(() => null),
        meetingService.listMeetings(false).catch(() => []),
      ]);

      const currentUserId = currentUser?.id ?? "";

      const active = allTasks.filter(
        (t) => t.status !== "completed" && t.status !== "cancelled",
      );

      const spanEvents: CalendarEvent[] = [];
      const deadlineEvents: CalendarEvent[] = [];
      const seenDeadlines = new Set<string>();

      for (const t of active) {
        const hasStart = t.start_date && t.start_date !== "";
        const hasEnd = t.end_date && t.end_date !== "";
        const isPrivateForeign = t.is_private && t.created_by !== currentUserId;
        const displayTitle = isPrivateForeign ? "Занят" : t.title;

        if (hasStart && hasEnd) {
          const s = new Date(t.start_date);
          const e = new Date(t.end_date);
          if (s <= end && e >= start) {
            spanEvents.push({ id: t.id, title: displayTitle, start: s, end: e, resource: t });
          }
        }

        if (hasEnd && !isPrivateForeign) {
          const deadline = new Date(t.end_date);
          if (deadline >= start && deadline <= end && !seenDeadlines.has(t.id)) {
            seenDeadlines.add(t.id);
            const deadlineEnd = new Date(deadline);
            deadlineEnd.setHours(23, 59, 59);
            deadlineEvents.push({
              id: `deadline-${t.id}`,
              title: `⏰ ${t.title}`,
              start: deadline,
              end: deadlineEnd,
              resource: t,
              isDeadline: true,
            });
          }
        }
      }

      const meetingEvents: CalendarEvent[] = meetings.map((m: Meeting) => ({
        id: `meeting-${m.id}`,
        title: m.meeting_url ? `🔗 ${m.title}` : `📍 ${m.title}`,
        start: new Date(m.start_at),
        end: new Date(new Date(m.start_at).getTime() + m.duration_min * 60_000),
        resource: m,
        isMeeting: true,
      }));

      setEvents([...spanEvents, ...deadlineEvents, ...meetingEvents]);
    } catch (e) {
      setError("Не удалось загрузить события календаря");
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
    } else if (range && typeof range === "object") {
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
        const parent = await (taskService as any).getTask?.(
          current.parent_task_id,
        );
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
      if (typeof updateFn !== "function") {
        setError(
          "В taskService нет updateTask(). Если скинешь taskService.ts — добавлю.",
        );
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
      setError("Не удалось обновить задачу");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      setLoading(true);
      setError(null);

      const deleteFn = (taskService as any).deleteTask;
      if (typeof deleteFn !== "function") {
        setError(
          "В taskService нет deleteTask(). Если скинешь taskService.ts — добавлю.",
        );
        return;
      }

      await deleteFn(taskId);

      const now = new Date();
      await loadEvents(startOfMonth(now), endOfMonth(now));

      setModalOpen(false);
      setSelectedTask(null);
    } catch (e) {
      setError("Не удалось удалить задачу");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ marginBottom: "16px" }}>Календарь</h1>

      {loading && (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "20px" }}
        >
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
