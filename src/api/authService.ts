import { apiClient } from './client';
import type { RegisterData, LoginData, User } from '../types';

interface AuthResponse {
  token: string;
  user: User;
}

// Map backend user object (display_name, name, surname) → frontend User type
function mapBackendUser(backendUser: any): User {
  return {
    id: backendUser.id ?? '',
    username: backendUser.display_name ?? backendUser.username ?? '',
    email: backendUser.email ?? '',
    first_name: backendUser.name ?? backendUser.first_name ?? '',
    last_name: backendUser.surname ?? backendUser.last_name ?? '',
    middle_name: backendUser.middle_name,
    timezone: backendUser.timezone ?? 'Europe/Moscow',
    telegram: backendUser.telegram,
    phone: backendUser.phone,
    contacts_visible: backendUser.contacts_visible ?? true,
  };
}

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    // Map frontend fields → backend fields
    const workingDays = (data.work_schedule ?? [])
      .filter((d) => d.is_working_day && d.start_time && d.end_time)
      .map((d) => ({
        weekday: d.day_of_week - 1, // frontend 1-7 → backend 0-6
        start_time: d.start_time!,
        end_time: d.end_time!,
      }));

    const payload = {
      email: data.email,
      password: data.password,
      display_name: data.username,
      name: data.first_name,
      surname: data.last_name,
      telegram: data.telegram || undefined,
      phone: data.phone || undefined,
      work_schedule: workingDays,
    };

    const response = await apiClient.post('/auth/register', payload);
    const body = response.data;

    const token: string = body.token;
    const user = mapBackendUser({ ...body.user, telegram: data.telegram, phone: data.phone });

    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));

    return { token, user };
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', {
      email: data.email,
      password: data.password,
    });
    const body = response.data;

    const token: string = body.token;
    const user = mapBackendUser(body.user);

    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));

    return { token, user };
  },

  async getCurrentUser(): Promise<User> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    // Return cached user if available
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      return JSON.parse(savedUser) as User;
    }

    // Fetch from API
    const response = await apiClient.get('/auth/me');
    const user = mapBackendUser(response.data);
    localStorage.setItem('current_user', JSON.stringify(user));
    return user;
  },

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    window.location.href = '/login';
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
