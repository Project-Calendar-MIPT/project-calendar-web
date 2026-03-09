// Mock Data
import type { User, Task, WorkScheduleDay } from '../types';

export type MockTask = Task & { allocated_hours: number };

const mockUser: User = {
    id: 'user-1',
    last_name: 'Иванов',
    first_name: 'Иван',
    middle_name: 'Иванович',
    username: 'ivan',
    email: 'ivan@example.com',
    timezone: 'Europe/Moscow',
    telegram: '@ivan',
    phone: '+7 (999) 123-45-67',
    contacts_visible: true,
};

const mockWorkSchedule: WorkScheduleDay[] = [
    { day_of_week: 1, is_working_day: true, start_time: '09:00', end_time: '18:00' },
    { day_of_week: 2, is_working_day: true, start_time: '10:00', end_time: '19:00' },
    { day_of_week: 3, is_working_day: true, start_time: '09:00', end_time: '18:00' },
    { day_of_week: 4, is_working_day: true, start_time: '09:00', end_time: '18:00' },
    { day_of_week: 5, is_working_day: true, start_time: '09:00', end_time: '17:00' },
    { day_of_week: 6, is_working_day: false },
    { day_of_week: 7, is_working_day: false },
];

const mockTasks: Task[] = [
    {
        id: 'proj-1',
        parent_task_id: null,
        title: 'Запуск веб-календаря',
        description: 'Подготовка и запуск MVP календаря',
        status: 'in_progress',
        priority: 'high',
        start_date: '2025-12-10T09:00:00Z',
    } as Task,
    {
        id: 'proj-2',
        parent_task_id: null,
        title: 'Онбординг команды',
        description: 'Настроить рабочие процессы и расписания',
        status: 'pending',
        priority: 'medium',
        start_date: '2025-12-12T10:00:00Z',
    } as Task,
    {
        id: 'proj-3',
        parent_task_id: null,
        title: 'Исследование пользователей',
        description: 'Интервью и анализ фидбэка',
        status: 'completed',
        priority: 'low',
        start_date: '2025-12-01T12:00:00Z',
    } as Task,
    {
        id: 'task-1',
        parent_task_id: 'proj-1',
        title: 'Сверстать CalendarPage',
        description: 'Сетка календаря, модалки задач',
        status: 'in_progress',
        priority: 'high',
        start_date: '2025-12-10T10:00:00Z',
    } as Task,
    {
        id: 'task-2',
        parent_task_id: 'proj-1',
        title: 'Настроить API задач',
        description: 'Связать фронт с бэком по задачам',
        status: 'pending',
        priority: 'medium',
        start_date: '2025-12-11T14:00:00Z',
    } as Task,
    {
        id: 'task-3',
        parent_task_id: 'proj-2',
        title: 'Собрать расписания',
        description: 'Заполнить рабочие расписания всей команды',
        status: 'cancelled',
        priority: 'low',
        start_date: '2025-12-15T09:00:00Z',
    } as Task,
].map((t, index) => {
    (t as any).allocated_hours = 4 + index * 2;
    return t;
});

export function fakeLoadProfileData(): Promise<{
    user: User;
    workSchedule: WorkScheduleDay[];
    tasks: Task[];
}> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                user: mockUser,
                workSchedule: mockWorkSchedule,
                tasks: mockTasks,
            });
        }, 600);
    });
}