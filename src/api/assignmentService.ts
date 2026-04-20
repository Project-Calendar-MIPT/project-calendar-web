import { apiClient } from "./client";
import type { Assignment, AssignmentData } from "../types";

export const assignmentService = {
  async getAssignments(taskId: string): Promise<Assignment[]> {
    const response = await apiClient.get<any[]>(`/tasks/${taskId}/assignments`);
    return (response.data || []).map((a: any) => ({
      id: a.id ?? "",
      task_id: taskId,
      user_id: a.user_id ?? "",
      role: a.role ?? "executor",
      allocated_hours: a.assigned_hours ? Number(a.assigned_hours) : 0,
      created_at: a.assigned_at,
      updated_at: a.assigned_at,
    }));
  },

  async assignUser(taskId: string, data: AssignmentData): Promise<Assignment> {
    try {
      const response = await apiClient.post<any>(
        `/tasks/${taskId}/assignments`,
        {
          user_id: data.user_id,
          role: data.role,
          assigned_hours: data.allocated_hours ?? 0,
        },
      );
      const a = response.data;
      return {
        id: a.id ?? "",
        task_id: taskId,
        user_id: data.user_id,
        role: data.role,
        allocated_hours: data.allocated_hours ?? 0,
        created_at: a.assigned_at,
        updated_at: a.assigned_at,
      };
    } catch (err: any) {
      // 409 means already assigned — treat as success
      if (err.response?.status === 409) {
        return {
          id: "",
          task_id: taskId,
          user_id: data.user_id,
          role: data.role,
          allocated_hours: data.allocated_hours ?? 0,
        };
      }
      throw err;
    }
  },

  async removeAssignment(taskId: string, userId: string): Promise<void> {
    await apiClient.delete(`/tasks/${taskId}/assignments/${userId}`);
  },
};
