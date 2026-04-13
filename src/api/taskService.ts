import { apiClient } from './client';
import type { Task, TasksQueryParams } from '../types';

// Backend uses 'normal'/'urgent', frontend uses 'medium'/'critical'
function mapPriorityFromBackend(p: string | undefined): Task['priority'] {
  if (p === 'normal') return 'medium';
  if (p === 'urgent') return 'critical';
  return (p as Task['priority']) ?? 'medium';
}

function mapPriorityToBackend(p: string | undefined): string {
  if (p === 'medium') return 'normal';
  if (p === 'critical') return 'urgent';
  return p ?? 'normal';
}

// Backend uses 'due_date', frontend uses 'end_date'
function mapTaskFromBackend(raw: any): Task {
  return {
    id: raw.id,
    parent_task_id: raw.parent_task_id ?? null,
    title: raw.title ?? '',
    description: raw.description ?? '',
    status: (raw.status === 'open' ? 'pending' : raw.status) as Task['status'],
    priority: mapPriorityFromBackend(raw.priority),
    start_date: raw.start_date ?? '',
    end_date: raw.due_date ?? raw.end_date ?? '',
    estimated_hours: raw.estimated_hours ? Number(raw.estimated_hours) : 0,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

function mapTaskToBackend(data: Partial<Task>): Record<string, any> {
  const payload: Record<string, any> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) payload.description = data.description || ' ';
  if (data.status !== undefined) payload.status = data.status;
  if (data.priority !== undefined) payload.priority = mapPriorityToBackend(data.priority);
  if (data.start_date !== undefined) payload.start_date = data.start_date;
  if (data.end_date !== undefined) payload.due_date = data.end_date;
  if (data.estimated_hours !== undefined) payload.estimated_hours = data.estimated_hours;
  if (data.parent_task_id !== undefined) payload.parent_task_id = data.parent_task_id;
  return payload;
}

export const taskService = {
  async getTasks(params?: TasksQueryParams): Promise<Task[]> {
    const queryParams: Record<string, string> = {};

    if (params?.parent_task_id === null) {
      queryParams.parent_task_id = 'null';
    } else if (params?.parent_task_id) {
      queryParams.parent_task_id = params.parent_task_id;
    }
    if (params?.status) queryParams.status = params.status;
    if (params?.priority) queryParams.priority = mapPriorityToBackend(params.priority);

    const response = await apiClient.get<any[]>('/tasks', { params: queryParams });
    return (response.data || []).map(mapTaskFromBackend);
  },

  async getTask(id: string): Promise<Task> {
    // TODO: заменить на GET /tasks/{id} когда бэкенд добавит маршрут
    const response = await apiClient.get<any[]>('/tasks');
    const all = (response.data || []).map(mapTaskFromBackend);
    const task = all.find((t) => t.id === id);
    if (!task) throw new Error('Task not found');
    return task;
  },

  async createTask(data: Partial<Task>): Promise<Task> {
    const payload = mapTaskToBackend(data);
    // description is required by backend
    if (!payload.description || payload.description.trim() === '') {
      payload.description = payload.title || 'Задача';
    }
    const response = await apiClient.post<any>('/tasks', payload);
    return mapTaskFromBackend(response.data);
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const payload = mapTaskToBackend(data);
    const response = await apiClient.put<any>(`/tasks/${id}`, payload);
    return mapTaskFromBackend(response.data);
  },

  async deleteTask(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  },

  async getSubtasks(id: string): Promise<Task[]> {
    const response = await apiClient.get<any[]>(`/tasks/${id}/subtasks`);
    return (response.data || []).map(mapTaskFromBackend);
  },

  async getTaskAssignments(taskId: string) {
    const response = await apiClient.get<any[]>(`/tasks/${taskId}/assignments`);
    return response.data || [];
  },

  async getTaskUsers(taskId: string) {
    const assignments = await this.getTaskAssignments(taskId);
    return assignments.map((a: any) => ({ id: a.user_id, username: a.display_name ?? '' }));
  },
};
