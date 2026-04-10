/*
Жду бэкенд

import { apiClient } from './client';
import type { Task, TasksQueryParams } from '../types';

export const taskService = {
  async getTasks(params?: TasksQueryParams) {
    const response = await apiClient.get<Task[]>('/tasks', { params });
    return response.data;
  },

  async getTask(id: string): Promise<Task> {
    const response = await apiClient.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  async createTask(data: Partial<Task>): Promise<Task> {
    const response = await apiClient.post<Task>('/tasks', data);
    return response.data;
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const response = await apiClient.put<Task>(`/tasks/${id}`, data);
    return response.data;
  },

  async deleteTask(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  },

  async getSubtasks(id: string): Promise<Task[]> {
    const response = await apiClient.get<Task[]>(`/tasks/${id}/subtasks`);
    return response.data;
  },
};

*/

import type { Task, TasksQueryParams } from '../types';
import { MOCK_TASKS, MOCK_USERS } from '../mock';
import { assignmentService } from '../minimal_test/api/assignmentService';

let mockTasks: Task[] = [...MOCK_TASKS];

const genId = () => 'task-' + Math.random().toString(36).slice(2);

const normalizeHours = (value: unknown): number => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
};

const getAutoStatus = (
  estimatedHours: number,
  currentStatus?: Task['status']
): Task['status'] => {
  if (currentStatus === 'completed' || currentStatus === 'cancelled') {
    return currentStatus;
  }

  return estimatedHours > 0 ? 'in_progress' : 'pending';
};

export const taskService = {
  async getTasks(params?: TasksQueryParams): Promise<Task[]> {
    await new Promise((r) => setTimeout(r, 200));

    if (params?.parent_task_id === null) {
      return mockTasks.filter((t) => !t.parent_task_id);
    }

    if (params?.parent_task_id) {
      return mockTasks.filter((t) => t.parent_task_id === params.parent_task_id);
    }

    return mockTasks;
  },

  async getTask(id: string): Promise<Task> {
    await new Promise((r) => setTimeout(r, 100));

    const task = mockTasks.find((t) => t.id === id);
    if (!task) {
      throw new Error('Task not found');
    }

    return task;
  },

  async createTask(data: Partial<Task>): Promise<Task> {
    await new Promise((r) => setTimeout(r, 300));

    const now = new Date().toISOString().split('T')[0];
    const estimatedHours = normalizeHours(data.estimated_hours);

    const newTask: Task = {
      id: genId(),
      parent_task_id: data.parent_task_id ?? null,
      title: data.title || 'Без названия',
      description: data.description || '',
      is_public: data.is_public ?? false,
      status: getAutoStatus(estimatedHours),
      priority: data.priority || 'medium',
      complexity: data.complexity,
      novelty: data.novelty,
      start_date: data.start_date || now,
      end_date: data.end_date || now,
      duration_days: data.duration_days,
      estimated_hours: estimatedHours,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockTasks.push(newTask);
    return newTask;
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    await new Promise((r) => setTimeout(r, 200));

    const index = mockTasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error('Task not found');
    }

    const currentTask = mockTasks[index];
    const estimatedHours =
      data.estimated_hours !== undefined
        ? normalizeHours(data.estimated_hours)
        : normalizeHours(currentTask.estimated_hours);

    const updated: Task = {
      ...currentTask,
      ...data,
      estimated_hours: estimatedHours,
      status: getAutoStatus(estimatedHours, currentTask.status),
      updated_at: new Date().toISOString(),
    };

    mockTasks[index] = updated;
    return updated;
  },

  async deleteTask(id: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 200));

    const deleteRecursive = (taskId: string) => {
      const subtasks = mockTasks.filter((t) => t.parent_task_id === taskId);
      subtasks.forEach((st) => deleteRecursive(st.id));
      mockTasks = mockTasks.filter((t) => t.id !== taskId);

      const currentAssignments = assignmentService.getMockAssignments();
      const filtered = currentAssignments.filter((a) => a.task_id !== taskId);
      assignmentService.setMockAssignments(filtered);
    };

    deleteRecursive(id);
  },

  async getSubtasks(id: string): Promise<Task[]> {
    await new Promise((r) => setTimeout(r, 100));
    return mockTasks.filter((t) => t.parent_task_id === id);
  },

  async getTaskAssignments(taskId: string) {
    await new Promise((r) => setTimeout(r, 100));
    return assignmentService.getMockAssignments().filter((a) => a.task_id === taskId);
  },

  async getTaskUsers(taskId: string) {
    await new Promise((r) => setTimeout(r, 100));

    const assignments = assignmentService
      .getMockAssignments()
      .filter((a) => a.task_id === taskId);
    const userIds = assignments.map((a) => a.user_id);

    return MOCK_USERS.filter((user) => userIds.includes(user.id));
  },
};
