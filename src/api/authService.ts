// временно не используем apiClient, пока нет бекенда
// import { apiClient } from './client';
import type { RegisterData, LoginData, User } from '../types';
import { validateUserCredentials, getUserByEmail, MOCK_USERS } from '../mock';

interface AuthResponse {
  token: string;
  user: User;
}

let currentUser: User | null = null;

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    // имитация сетевой задержки
    await new Promise((r) => setTimeout(r, 500));

    // Проверяем, существует ли пользователь с таким email
    const existingUser = getUserByEmail(data.email);
    if (existingUser) {
      throw new Error('Пользователь с таким email уже существует');
    }

    // В mock режиме просто принимаем регистрацию без сохранения
    // Используем первого пользователя из mock данных для демонстрации
    const fakeUser: User = {
      id: 'temp-' + Date.now(),
      username: data.username,
      email: data.email,
      last_name: data.last_name,
      first_name: data.first_name,
      middle_name: data.middle_name,
      timezone: data.timezone,
      telegram: data.telegram,
      phone: data.phone,
      contacts_visible: data.contacts_visible,
    };

    const token = 'fake-jwt-token-' + fakeUser.id;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(fakeUser));
    currentUser = fakeUser;
    return { token, user: fakeUser };
  },

  async login(data: LoginData): Promise<AuthResponse> {
    await new Promise((r) => setTimeout(r, 500));

    // Валидация пользователя по email и паролю
    const user = validateUserCredentials(data.email, data.password);
    
    if (!user) {
      // Проверяем, существует ли пользователь с таким email
      const existingUser = getUserByEmail(data.email);
      if (existingUser) {
        throw new Error('Неверный пароль');
      } else {
        throw new Error('Пользователя с такими данными не существует');
      }
    }

    const token = 'fake-jwt-token-' + user.id;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));
    currentUser = user;
    return { token, user };
  },

  async getCurrentUser(): Promise<User> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    // Проверяем сохраненного пользователя
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      currentUser = JSON.parse(savedUser);
      return currentUser!;
    }

    // Fallback на первого пользователя
    currentUser = MOCK_USERS[0];
    return currentUser;
  },

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    currentUser = null;
    window.location.href = '/login';
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
