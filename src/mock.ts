import type { User, Task, Assignment } from './types';

export const USE_MOCK = true;

export const MOCK_USERS: User[] = [
  {
    id: 'user-impelix',
    username: 'impelix',
    email: 'impelix@pumpelix.love',
    full_name: 'Дмитрий Силантьев',
    timezone: 'Europe/Moscow',
    skills: ['react', 'typescript', 'ui', 'frontend', 'calendar'],
  },
  {
    id: 'user-genorto',
    username: 'genorto',
    email: 'wildberries-manger@dubai.com',
    full_name: 'Илья Набоков',
    timezone: 'Europe/Moscow',
    skills: ['react', 'typescript', 'modal', 'frontend', 'ux'],
  },
  {
    id: 'user-kezorka',
    username: 'kezorka',
    email: 'kezorka@polyana.opushka',
    full_name: 'Егор Коробкин',
    timezone: 'Europe/Moscow',
    skills: ['testing', 'mocks', 'qa', 'frontend'],
  },
  {
    id: 'user-titlha',
    username: 'titlha',
    email: 'titlha@brdlha.mephi',
    full_name: 'Алексей Маклюков',
    timezone: 'Europe/Moscow',
    skills: ['api', 'integration', 'typescript', 'backend'],
  },
  {
    id: 'user-noway',
    username: 'noway',
    email: 'baby@cute.love',
    full_name: 'Федор Ноувей',
    timezone: 'Europe/Moscow',
    skills: ['backend', 'users', 'auth', 'api', 'node'],
  },
  {
    id: 'user-solovieva',
    username: 'solovieva',
    email: 'maria.solovieva@example.com',
    full_name: 'Робин Пресс',
    timezone: 'Europe/Moscow',
    skills: ['calendar', 'react', 'frontend', 'ux'],
  },
  {
    id: 'user_kantserov',
    username: 'roman_kantserov',
    email: 'roman.kantserov@example.com',
    full_name: 'Роман Канцеров',
    timezone: 'Europe/Moscow',
    skills: ['ui', 'design-system', 'frontend', 'components'],
  },
  {
    id: 'user-smirnova',
    username: 'smirnova',
    email: 'alexandra.smirnova@example.com',
    full_name: 'Александра Смирнова',
    timezone: 'Europe/Moscow',
    skills: ['qa', 'manual-testing', 'e2e'],
  },
  {
    id: 'user-kuznetsov',
    username: 'kuznetsov',
    email: 'dmitry.kuznetsov@example.com',
    full_name: 'Дмитрий Кузнецов',
    timezone: 'Europe/Moscow',
    skills: ['security', 'review', 'backend'],
  },
  {
    id: 'user-volkova',
    username: 'volkova_e',
    email: 'elena.volkova@example.com',
    full_name: 'Елена Волкова',
    timezone: 'Europe/Moscow',
    skills: ['documentation', 'ux', 'frontend'],
  },
  {
    id: 'user-sidorov',
    username: 'sidorov_pm',
    email: 'project.manager@example.com',
    full_name: 'Егор Яковлев',
    timezone: 'Europe/Moscow',
    skills: ['management', 'planning', 'coordination'],
  },
  {
    id: 'user-admin',
    username: 'admin',
    email: 'admin@example.com',
    full_name: 'Администратор',
    timezone: 'Europe/Moscow',
    skills: ['security', 'infra', 'admin'],
  },
  {
    id: 'user-sokolov',
    username: 'sokolov',
    email: 'alex.sokolov@example.com',
    full_name: 'Алексей Соколов',
    timezone: 'Europe/Moscow',
    skills: ['tasks', 'backend', 'service', 'api'],
  },
  {
    id: 'user-morozova',
    username: 'morozova',
    email: 'natalia.morozova@example.com',
    full_name: 'Наталья Морозова',
    timezone: 'Europe/Moscow',
    skills: ['permissions', 'roles', 'backend', 'security'],
  },
  {
    id: 'user-lebedev',
    username: 'lebedev',
    email: 'pavel.lebedev@example.com',
    full_name: 'Павел Лебедев',
    timezone: 'Europe/Moscow',
    skills: ['database', 'sql', 'backend'],
  },
  {
    id: 'user-novikova',
    username: 'novikova',
    email: 'olga.novikova@example.com',
    full_name: 'Ольга Новикова',
    timezone: 'Europe/Moscow',
    skills: ['schedule', 'planning', 'backend'],
  },
];

export const MOCK_PASSWORD = 'helloworld';

export const MOCK_TASKS: Task[] = [
  {
    id: 'proj-mvp',
    parent_task_id: null,
    title: 'Project Calendar MVP',
    description: 'Разработка MVP приложения для управления проектами и задачами',
    status: 'in_progress',
    priority: 'high',
    start_date: '2025-11-20',
    end_date: '2026-01-15',
    estimated_hours: 160,
    required_skills: ['management', 'frontend', 'backend'],
  },
  {
    id: 'proj-frontend',
    parent_task_id: null,
    title: 'Frontend Development',
    description: 'Разработка фронтенда приложения',
    status: 'in_progress',
    priority: 'high',
    start_date: '2025-11-20',
    end_date: '2026-01-10',
    estimated_hours: 120,
    required_skills: ['frontend', 'react', 'typescript'],
  },
  {
    id: 'proj-backend',
    parent_task_id: null,
    title: 'Backend Development',
    description: 'Разработка API и логики приложения',
    status: 'in_progress',
    priority: 'high',
    start_date: '2025-11-20',
    end_date: '2026-01-05',
    estimated_hours: 140,
    required_skills: ['backend', 'api', 'service'],
  },
  {
    id: 'proj-devops',
    parent_task_id: null,
    title: 'DevOps & Infrastructure',
    description: 'Настройка Docker, CI/CD, мониторинга',
    status: 'in_progress',
    priority: 'high',
    start_date: '2025-11-25',
    end_date: '2025-12-15',
    estimated_hours: 40,
    required_skills: ['infra', 'security'],
  },
  {
    id: 'proj-testing',
    parent_task_id: null,
    title: 'Testing & QA',
    description: 'Автотесты, интеграционные тесты, E2E тесты',
    status: 'pending',
    priority: 'high',
    start_date: '2025-12-01',
    end_date: '2026-01-05',
    estimated_hours: 50,
    required_skills: ['qa', 'testing'],
  },
  {
    id: 'proj-docs',
    parent_task_id: null,
    title: 'Documentation',
    description: 'Документация API, руководство пользователя, README',
    status: 'in_progress',
    priority: 'medium',
    start_date: '2025-11-30',
    end_date: '2026-01-10',
    estimated_hours: 20,
    required_skills: ['documentation'],
  },
  {
    id: 'proj-bugs',
    parent_task_id: null,
    title: 'Bug Fixes & Optimization',
    description: 'Исправление ошибок, оптимизация производительности',
    status: 'pending',
    priority: 'medium',
    start_date: '2025-12-05',
    end_date: '2026-01-15',
    estimated_hours: 30,
    required_skills: ['frontend', 'backend'],
  },
  {
    id: 'proj-security',
    parent_task_id: null,
    title: 'Security Review',
    description: 'Проверка безопасности, penetration testing',
    status: 'pending',
    priority: 'high',
    start_date: '2025-12-10',
    end_date: '2026-01-05',
    estimated_hours: 24,
    required_skills: ['security'],
  },

  {
    id: 'task-usersearch',
    parent_task_id: 'proj-frontend',
    title: 'Реализовать UserSearch компонент',
    description: 'Компонент для поиска пользователей с debounce 300ms',
    status: 'completed',
    priority: 'high',
    start_date: '2025-11-25',
    end_date: '2025-11-27',
    estimated_hours: 8,
    required_skills: ['react', 'typescript', 'frontend'],
  },
  {
    id: 'task-taskmodal',
    parent_task_id: 'proj-frontend',
    title: 'Создать TaskDetailModal',
    description: 'Модальное окно для отображения деталей задачи',
    status: 'in_progress',
    priority: 'high',
    start_date: '2025-11-26',
    end_date: '2025-11-28',
    estimated_hours: 6,
    required_skills: ['react', 'modal', 'frontend'],
  },
  {
    id: 'task-testenv',
    parent_task_id: 'proj-frontend',
    title: 'Настроить тестовое окружение',
    description: 'Подготовить моковые данные и API для тестирования',
    status: 'pending',
    priority: 'medium',
    start_date: '2025-11-29',
    end_date: '2025-11-30',
    estimated_hours: 4,
    required_skills: ['testing', 'mocks'],
  },
  {
    id: 'task-calendar',
    parent_task_id: 'proj-frontend',
    title: 'Реализовать Calendar компонент',
    description: 'Интерактивный календарь для просмотра задач',
    status: 'in_progress',
    priority: 'high',
    start_date: '2025-11-28',
    end_date: '2025-12-05',
    estimated_hours: 16,
    required_skills: ['calendar', 'react', 'frontend'],
  },
  {
    id: 'task-uikit',
    parent_task_id: 'proj-frontend',
    title: 'Создать UI Kit компоненты',
    description: 'Базовые компоненты: Button, Input, Select, Modal',
    status: 'in_progress',
    priority: 'medium',
    start_date: '2025-11-25',
    end_date: '2025-12-02',
    estimated_hours: 12,
    required_skills: ['ui', 'components', 'frontend'],
  },
  {
    id: 'task-apiintegration',
    parent_task_id: 'proj-frontend',
    title: 'Интеграция с API',
    description: 'Подключение к backend API всех компонентов',
    status: 'pending',
    priority: 'high',
    start_date: '2025-12-01',
    end_date: '2025-12-10',
    estimated_hours: 20,
    required_skills: ['api', 'integration', 'typescript'],
  },

  {
    id: 'task-userservice',
    parent_task_id: 'proj-backend',
    title: 'Реализовать User Service',
    description: 'Сервис для управления пользователями и поиска',
    status: 'in_progress',
    priority: 'high',
    start_date: '2025-11-25',
    end_date: '2025-12-05',
    estimated_hours: 20,
    required_skills: ['backend', 'users', 'service'],
  },
  {
    id: 'task-taskservice',
    parent_task_id: 'proj-backend',
    title: 'Реализовать Task Service',
    description: 'Сервис для управления задачами и иерархией',
    status: 'in_progress',
    priority: 'high',
    start_date: '2025-11-25',
    end_date: '2025-12-08',
    estimated_hours: 24,
    required_skills: ['backend', 'tasks', 'service'],
  },
  {
    id: 'task-permissionservice',
    parent_task_id: 'proj-backend',
    title: 'Реализовать Permission Service',
    description: 'Система управления разрешениями и ролями',
    status: 'in_progress',
    priority: 'high',
    start_date: '2025-11-26',
    end_date: '2025-12-10',
    estimated_hours: 28,
    required_skills: ['permissions', 'roles', 'security'],
  },
  {
    id: 'task-scheduleservice',
    parent_task_id: 'proj-backend',
    title: 'Реализовать Schedule Service',
    description: 'Сервис управления расписанием и конфликтами',
    status: 'pending',
    priority: 'medium',
    start_date: '2025-12-01',
    end_date: '2025-12-15',
    estimated_hours: 30,
    required_skills: ['schedule', 'planning', 'backend'],
  },
  {
    id: 'task-database',
    parent_task_id: 'proj-backend',
    title: 'Настроить Database',
    description: 'Создание схемы БД, миграции, индексы',
    status: 'completed',
    priority: 'high',
    start_date: '2025-11-20',
    end_date: '2025-11-24',
    estimated_hours: 16,
    required_skills: ['database', 'sql'],
  },
  {
    id: 'task-auth',
    parent_task_id: 'proj-backend',
    title: 'Настроить Authentication',
    description: 'JWT токены и система аутентификации',
    status: 'in_progress',
    priority: 'high',
    start_date: '2025-11-24',
    end_date: '2025-12-01',
    estimated_hours: 12,
    required_skills: ['auth', 'backend', 'security'],
  },
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: 'assign-1', task_id: 'task-usersearch', user_id: 'user-impelix', role: 'owner', allocated_hours: 8 },
  { id: 'assign-2', task_id: 'task-taskmodal', user_id: 'user-genorto', role: 'owner', allocated_hours: 6 },
  { id: 'assign-3', task_id: 'task-taskmodal', user_id: 'user-impelix', role: 'executor', allocated_hours: 4 },
  { id: 'assign-4', task_id: 'task-testenv', user_id: 'user-kezorka', role: 'owner', allocated_hours: 4 },
  { id: 'assign-5', task_id: 'task-calendar', user_id: 'user-solovieva', role: 'owner', allocated_hours: 16 },
  { id: 'assign-6', task_id: 'task-uikit', user_id: 'user_kantserov', role: 'owner', allocated_hours: 12 },
  { id: 'assign-7', task_id: 'task-apiintegration', user_id: 'user-titlha', role: 'owner', allocated_hours: 20 },
  { id: 'assign-8', task_id: 'task-apiintegration', user_id: 'user-noway', role: 'executor', allocated_hours: 10 },
  { id: 'assign-9', task_id: 'task-userservice', user_id: 'user-noway', role: 'owner', allocated_hours: 20 },
  { id: 'assign-10', task_id: 'task-taskservice', user_id: 'user-sokolov', role: 'owner', allocated_hours: 24 },
  { id: 'assign-11', task_id: 'task-permissionservice', user_id: 'user-morozova', role: 'owner', allocated_hours: 28 },

  { id: 'assign-proj-1', task_id: 'proj-mvp', user_id: 'user-sidorov', role: 'owner', allocated_hours: 0 },
  { id: 'assign-proj-2', task_id: 'proj-frontend', user_id: 'user-sidorov', role: 'owner', allocated_hours: 0 },
  { id: 'assign-proj-3', task_id: 'proj-backend', user_id: 'user-sidorov', role: 'owner', allocated_hours: 0 },
  { id: 'assign-proj-4', task_id: 'proj-devops', user_id: 'user-sidorov', role: 'owner', allocated_hours: 0 },
  { id: 'assign-proj-5', task_id: 'proj-testing', user_id: 'user-sidorov', role: 'owner', allocated_hours: 0 },
  { id: 'assign-proj-6', task_id: 'proj-docs', user_id: 'user-sidorov', role: 'owner', allocated_hours: 0 },
  { id: 'assign-proj-7', task_id: 'proj-bugs', user_id: 'user-sidorov', role: 'owner', allocated_hours: 0 },
  { id: 'assign-proj-8', task_id: 'proj-security', user_id: 'user-admin', role: 'owner', allocated_hours: 0 },

  { id: 'assign-fe-1', task_id: 'proj-frontend', user_id: 'user-impelix', role: 'executor', allocated_hours: 0 },
  { id: 'assign-fe-2', task_id: 'proj-frontend', user_id: 'user-genorto', role: 'executor', allocated_hours: 0 },
  { id: 'assign-fe-3', task_id: 'proj-frontend', user_id: 'user-kezorka', role: 'executor', allocated_hours: 0 },
  { id: 'assign-fe-4', task_id: 'proj-frontend', user_id: 'user-solovieva', role: 'executor', allocated_hours: 0 },
  { id: 'assign-fe-5', task_id: 'proj-frontend', user_id: 'user_kantserov', role: 'executor', allocated_hours: 0 },
  { id: 'assign-fe-6', task_id: 'proj-frontend', user_id: 'user-titlha', role: 'executor', allocated_hours: 0 },

  { id: 'assign-be-1', task_id: 'proj-backend', user_id: 'user-noway', role: 'executor', allocated_hours: 0 },
  { id: 'assign-be-2', task_id: 'proj-backend', user_id: 'user-sokolov', role: 'executor', allocated_hours: 0 },
  { id: 'assign-be-3', task_id: 'proj-backend', user_id: 'user-morozova', role: 'executor', allocated_hours: 0 },
  { id: 'assign-be-4', task_id: 'proj-backend', user_id: 'user-lebedev', role: 'executor', allocated_hours: 0 },
  { id: 'assign-be-5', task_id: 'proj-backend', user_id: 'user-novikova', role: 'executor', allocated_hours: 0 },
  { id: 'assign-be-6', task_id: 'proj-backend', user_id: 'user-impelix', role: 'executor', allocated_hours: 0 },
];

export function getUserByEmail(email: string): User | undefined {
  return MOCK_USERS.find((u) => u.email === email);
}

export function validateUserCredentials(email: string, password: string): User | null {
  if (password !== MOCK_PASSWORD) {
    return null;
  }
  return getUserByEmail(email) || null;
}

export function getTasksByUserId(userId: string): Task[] {
  const userAssignments = MOCK_ASSIGNMENTS.filter((a) => a.user_id === userId);
  const taskIds = userAssignments.map((a) => a.task_id);
  return MOCK_TASKS.filter((t) => taskIds.includes(t.id));
}

export function getProjectsByUserId(userId: string): Task[] {
  return getTasksByUserId(userId).filter((t) => t.parent_task_id === null);
}

export function getTasksByParentId(parentId: string | null): Task[] {
  return MOCK_TASKS.filter((t) => t.parent_task_id === parentId);
}

export function getAssignmentsByTaskId(taskId: string): Assignment[] {
  return MOCK_ASSIGNMENTS.filter((a) => a.task_id === taskId);
}

export function getUsersByTaskId(taskId: string): User[] {
  const assignments = getAssignmentsByTaskId(taskId);
  const userIds = assignments.map((a) => a.user_id);
  return MOCK_USERS.filter((u) => userIds.includes(u.id));
}

export function getTaskById(taskId: string): Task | undefined {
  return MOCK_TASKS.find((t) => t.id === taskId);
}
