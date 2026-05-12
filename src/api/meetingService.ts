import { apiClient } from "./client";

export interface Meeting {
  id: string;
  title: string;
  description: string;
  organizer_id: string;
  start_at: string;
  duration_min: number;
  meeting_url: string;
  location: string;
  is_organizer: boolean;
  participant_ids?: string[];
}

export interface CreateMeetingData {
  title: string;
  description?: string;
  start_at: string;
  duration_min: number;
  meeting_url?: string;
  location?: string;
  participant_ids: string[];
}

export const meetingService = {
  async listMeetings(upcoming = false): Promise<Meeting[]> {
    const res = await apiClient.get<Meeting[]>("/meetings", {
      params: { upcoming: upcoming ? "true" : "false" },
    });
    return res.data || [];
  },

  async createMeeting(data: CreateMeetingData): Promise<Meeting> {
    const res = await apiClient.post<Meeting>("/meetings", data);
    return res.data;
  },

  async deleteMeeting(id: string): Promise<void> {
    await apiClient.delete(`/meetings/${id}`);
  },
};
