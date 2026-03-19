import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Modal } from './ui/Modal';
import { assignmentService } from '../minimal_test/api/assignmentService';
import { taskService } from '../api/taskService';
import { MOCK_USERS } from '../mock';
import type { Assignment, Task, User } from '../types';
import './AssignmentManager.scss';

interface AssignmentManagerProps {
  projectId: string;
  onAssignmentChange?: () => void;
}

const ROLE_OPTIONS = [
  { value: 'supervisor', label: 'Руководитель' },
  { value: 'executor', label: 'Исполнитель' },
  { value: 'hybrid', label: 'Гибридная' },
  { value: 'spectator', label: 'Наблюдатель' },
];

type MemberItem = {
  user_id: string;
  role: string;
};

type CandidateProfile = {
  user: User;
  activeTasks: Task[];
  overlappingTasks: Task[];
};

const normalizeRange = (start?: string, end?: string) => {
  if (!start && !end) {
    return null;
  }

  const normalizedStart = start || end || '';
  const normalizedEnd = end || start || '';

  if (!normalizedStart || !normalizedEnd) {
    return null;
  }

  return normalizedStart <= normalizedEnd
    ? { start: normalizedStart, end: normalizedEnd }
    : { start: normalizedEnd, end: normalizedStart };
};

const hasDateOverlap = (
  aStart?: string,
  aEnd?: string,
  bStart?: string,
  bEnd?: string
): boolean => {
  const first = normalizeRange(aStart, aEnd);
  const second = normalizeRange(bStart, bEnd);

  if (!first || !second) {
    return false;
  }

  return first.start <= second.end && second.start <= first.end;
};

export const AssignmentManager: React.FC<AssignmentManagerProps> = ({
  projectId,
  onAssignmentChange,
}) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [assignableTasks, setAssignableTasks] = useState<Task[]>([]);
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [displayMembers, setDisplayMembers] = useState<MemberItem[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    task_id: '',
    user_id: '',
    role: 'executor',
    allocated_hours: 0,
  });
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [candidateProfiles, setCandidateProfiles] = useState<Record<string, CandidateProfile>>({});
  const [error, setError] = useState('');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const selectedProfile = useMemo(() => {
    if (!profileUserId) return null;
    return candidateProfiles[profileUserId] || null;
  }, [candidateProfiles, profileUserId]);

  const rolePriority: Record<string, number> = {
    owner: 5,
    supervisor: 4,
    hybrid: 3,
    executor: 2,
    spectator: 1,
  };

  const collectAllProjectTasks = (tasks: Task[], rootProjectId: string): Task[] => {
    const result: Task[] = [];
    const visited = new Set<string>();

    const dfs = (parentId: string) => {
      const children = tasks.filter((t) => t.parent_task_id === parentId);

      for (const child of children) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        result.push(child);
        dfs(child.id);
      }
    };

    const projectTask = tasks.find((t) => t.id === rootProjectId);
    if (projectTask) {
      visited.add(projectTask.id);
      result.push(projectTask);
    }

    dfs(rootProjectId);

    return result;
  };

  const loadAssignments = React.useCallback(async () => {
    try {
      const fetchedTasks = await taskService.getTasks();
      setAllTasks(fetchedTasks);

      const relatedTasks = collectAllProjectTasks(fetchedTasks, projectId);
      setProjectTasks(relatedTasks);

      const allAssignments: Assignment[] = [];
      for (const task of relatedTasks) {
        const taskAssignments = await assignmentService.getAssignments(task.id);
        allAssignments.push(...taskAssignments);
      }
      setAssignments(allAssignments);

      const projectAssignments = await assignmentService.getAssignments(projectId);
      const memberIds = projectAssignments.map((a) => a.user_id);
      setProjectMembers(memberIds);

      const availableTasks = relatedTasks.filter(
        (t) =>
          t.id !== projectId &&
          t.status !== 'completed' &&
          t.status !== 'cancelled'
      );
      setAssignableTasks(availableTasks);

      const uniqueMembersMap = new Map<string, MemberItem>();

      allAssignments.forEach((assignment) => {
        const existing = uniqueMembersMap.get(assignment.user_id);

        if (!existing) {
          uniqueMembersMap.set(assignment.user_id, {
            user_id: assignment.user_id,
            role: assignment.role,
          });
          return;
        }

        const currentPriority = rolePriority[assignment.role] || 0;
        const existingPriority = rolePriority[existing.role] || 0;

        if (currentPriority > existingPriority) {
          uniqueMembersMap.set(assignment.user_id, {
            user_id: assignment.user_id,
            role: assignment.role,
          });
        }
      });

      setDisplayMembers(Array.from(uniqueMembersMap.values()));
    } catch (err) {
      console.error('Ошибка при загрузке назначений:', err);
    }
  }, [projectId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    const selectedTask = projectTasks.find((task) => task.id === formData.task_id);

    if (!selectedTask) {
      setAvailableUsers([]);
      setCandidateProfiles({});
      setFormData((prev) => ({ ...prev, user_id: '' }));
      return;
    }

    const baseUsers =
      projectMembers.length > 0
        ? MOCK_USERS.filter((user) => projectMembers.includes(user.id))
        : MOCK_USERS;

    if (!selectedTask.start_date && !selectedTask.end_date) {
      const profiles: Record<string, CandidateProfile> = {};
      baseUsers.forEach((user) => {
        profiles[user.id] = {
          user,
          activeTasks: [],
          overlappingTasks: [],
        };
      });
      setAvailableUsers(baseUsers);
      setCandidateProfiles(profiles);
      return;
    }

    const allAssignments = assignmentService.getMockAssignments();
    const profiles: Record<string, CandidateProfile> = {};
    const freeUsers: User[] = [];

    for (const user of baseUsers) {
      const userAssignments = allAssignments.filter((assignment) => assignment.user_id === user.id);

      const activeTasks = userAssignments
        .map((assignment) => allTasks.find((task) => task.id === assignment.task_id))
        .filter((task): task is Task => Boolean(task))
        .filter(
          (task) =>
            task.id !== selectedTask.id &&
            task.parent_task_id !== null &&
            task.status !== 'completed' &&
            task.status !== 'cancelled'
        );

      const overlappingTasks = activeTasks.filter((task) =>
        hasDateOverlap(
          selectedTask.start_date,
          selectedTask.end_date,
          task.start_date,
          task.end_date
        )
      );

      profiles[user.id] = {
        user,
        activeTasks,
        overlappingTasks,
      };

      if (overlappingTasks.length === 0) {
        freeUsers.push(user);
      }
    }

    setCandidateProfiles(profiles);
    setAvailableUsers(freeUsers);

    setFormData((prev) => {
      if (!prev.user_id) return prev;
      const stillAvailable = freeUsers.some((user) => user.id === prev.user_id);
      return stillAvailable ? prev : { ...prev, user_id: '' };
    });
  }, [formData.task_id, projectMembers, projectTasks, allTasks]);

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.task_id) {
      setError('Выберите задачу');
      return;
    }

    if (!formData.user_id) {
      setError('Выберите пользователя');
      return;
    }

    try {
      await assignmentService.assignUser(formData.task_id, {
        user_id: formData.user_id,
        role: formData.role as any,
        allocated_hours: formData.allocated_hours,
      });

      await loadAssignments();
      onAssignmentChange?.();

      setIsModalOpen(false);
      setFormData({
        task_id: '',
        user_id: '',
        role: 'executor',
        allocated_hours: 0,
      });
      setAvailableUsers([]);
      setCandidateProfiles({});
    } catch (err: any) {
      setError(err.message || 'Ошибка при назначении');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const userAssignments = assignments.filter(
        (a) => a.user_id === userId && a.role !== 'owner'
      );

      for (const assignment of userAssignments) {
        await assignmentService.removeAssignment(assignment.id);
      }

      await loadAssignments();
      onAssignmentChange?.();
    } catch (err) {
      console.error('Ошибка при удалении участника:', err);
    }
  };

  const getUserName = (userId: string): string => {
    const user = MOCK_USERS.find((u) => u.id === userId);
    return user?.full_name || user?.username || 'Unknown';
  };

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      owner: 'Владелец',
      supervisor: 'Руководитель',
      executor: 'Исполнитель',
      hybrid: 'Гибридная',
      spectator: 'Наблюдатель',
    };
    return labels[role] || role;
  };

  const buildTaskLabel = (task: Task): string => {
    return task.title;
  };

  const selectedTask = projectTasks.find((task) => task.id === formData.task_id);
  const selectedTaskHasDates = Boolean(selectedTask?.start_date || selectedTask?.end_date);

  return (
    <>
      <div className="assignment-manager">
        <div className="assignment-manager__header">
          <h3>Назначения</h3>
          <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm">
            + Назначить
          </Button>
        </div>

        {displayMembers.length > 0 ? (
          <div className="assignment-manager__list">
            {displayMembers.map((member) => (
              <div key={member.user_id} className="assignment-manager__item">
                <div className="assignment-manager__info">
                  <span className="assignment-manager__user">
                    {getUserName(member.user_id)}
                  </span>
                  <span className="assignment-manager__role">
                    {getRoleLabel(member.role)}
                  </span>
                </div>

                {member.role !== 'owner' && (
                  <Button
                    onClick={() => handleRemoveMember(member.user_id)}
                    variant="danger"
                    size="sm"
                  >
                    Удалить
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="assignment-manager__empty">Никого не назначено</p>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Назначить на задачу"
          size="md"
        >
          <form onSubmit={handleAssignUser} className="assignment-manager__form">
            <Select
              label="Задача"
              options={assignableTasks.map((t) => ({
                value: t.id,
                label: buildTaskLabel(t),
              }))}
              value={formData.task_id}
              onChange={(e) =>
                setFormData({ ...formData, task_id: e.target.value, user_id: '' })
              }
              required
            />

            <Select
              label="Пользователь"
              options={availableUsers.map((u) => ({
                value: u.id,
                label: u.full_name,
              }))}
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              required
            />

            {selectedTaskHasDates && (
              <div className="assignment-manager__hint">
                {availableUsers.length > 0
                  ? `Доступно сотрудников: ${availableUsers.length}`
                  : 'Нет свободных сотрудников на даты выбранной задачи'}
              </div>
            )}

            <div className="assignment-manager__candidate-actions">
              <Button
                type="button"
                variant="outline"
                disabled={!formData.user_id}
                onClick={() => setProfileUserId(formData.user_id)}
              >
                Профиль кандидата
              </Button>
            </div>

            <Select
              label="Роль"
              options={ROLE_OPTIONS}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />

            <Input
              label="Часы"
              type="number"
              value={formData.allocated_hours.toString()}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  allocated_hours: parseFloat(e.target.value) || 0,
                })
              }
            />

            {error && <div className="assignment-manager__error">{error}</div>}

            <div className="assignment-manager__actions">
              <Button type="submit" variant="primary">
                Назначить
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </Modal>
      </div>

      <Modal
        isOpen={!!selectedProfile}
        onClose={() => setProfileUserId(null)}
        title="Профиль кандидата"
        size="md"
      >
        {selectedProfile && (
          <div className="candidate-profile">
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">ФИО:</span>
              <span>{selectedProfile.user.full_name}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Логин:</span>
              <span>{selectedProfile.user.username}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Email:</span>
              <span>{selectedProfile.user.email}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Часовой пояс:</span>
              <span>{selectedProfile.user.timezone}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Стек:</span>
              <span>Не указан в текущих данных</span>
            </div>
            <div className="candidate-profile__row candidate-profile__row--top">
              <span className="candidate-profile__label">Активные задачи:</span>
              <div className="candidate-profile__tasks">
                {selectedProfile.activeTasks.length > 0 ? (
                  selectedProfile.activeTasks.map((task) => (
                    <div key={task.id} className="candidate-profile__task">
                      <strong>{task.title}</strong>
                      <span>
                        {task.start_date} — {task.end_date}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="candidate-profile__empty">Нет активных задач</span>
                )}
              </div>
            </div>
            {selectedProfile.overlappingTasks.length > 0 && (
              <div className="candidate-profile__warning">
                На даты выбранной задачи у сотрудника есть пересечения.
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};
