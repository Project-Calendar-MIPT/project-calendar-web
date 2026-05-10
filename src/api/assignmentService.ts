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

  async changeProjectRole(projectId: string, userId: string, newRole: string): Promise<void> {
    try {
      await apiClient.delete(`/tasks/${projectId}/assignments/${userId}`);
    } catch (e: any) {
      if (e.response?.status !== 404) throw e;
    }
    await apiClient.post(`/tasks/${projectId}/assignments`, {
      user_id: userId,
      role: newRole,
      assigned_hours: 0,
    });
  },

  async getAssignmentsWithNames(taskId: string): Promise<{ user_id: string; role: string; display_name: string }[]> {
    const response = await apiClient.get<any[]>(`/tasks/${taskId}/assignments`);
    const asgs = response.data || [];
    return Promise.all(
      asgs.map(async (a: any) => {
        try {
          const userResp = await apiClient.get<any>(`/users/${a.user_id}`);
          const u = userResp.data;
          return {
            user_id: a.user_id,
            role: a.role ?? "executor",
            display_name:
              u.display_name ||
              [u.surname, u.name].filter(Boolean).join(" ") ||
              u.email ||
              a.user_id,
          };
        } catch {
          return { user_id: a.user_id, role: a.role ?? "executor", display_name: a.user_id };
        }
      }),
    );
  },

  async applyToProject(projectId: string): Promise<void> {
    await apiClient.post(`/projects/${projectId}/apply`);
  },

  async getApplications(projectId: string): Promise<any[]> {
    const response = await apiClient.get<any[]>(`/projects/${projectId}/applications`);
    return response.data || [];
  },

  async approveApplication(projectId: string, applicationId: string): Promise<void> {
    await apiClient.post(`/projects/${projectId}/applications/${applicationId}/approve`);
  },

  async rejectApplication(projectId: string, applicationId: string): Promise<void> {
    await apiClient.post(`/projects/${projectId}/applications/${applicationId}/reject`);
  },
};
