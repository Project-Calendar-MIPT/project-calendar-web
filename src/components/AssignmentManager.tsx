import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Modal } from './ui/Modal';
import { assignmentService } from '../minimal_test/api/assignmentService';
import { taskService } from '../api/taskService';
import { MOCK_USERS } from '../mock';
import type { Assignment, Task } from '../types';
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

export const AssignmentManager: React.FC<AssignmentManagerProps> = ({
  projectId,
  onAssignmentChange,
}) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [, setProjectTasks] = useState<Task[]>([]);
  const [assignableTasks, setAssignableTasks] = useState<Task[]>([]);
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [displayMembers, setDisplayMembers] = useState<MemberItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    task_id: '',
    user_id: '',
    role: 'executor',
    allocated_hours: 0,
  });
  const [error, setError] = useState('');

  const rolePriority: Record<string, number> = {
    owner: 5,
    supervisor: 4,
    hybrid: 3,
    executor: 2,
    spectator: 1,
  };

  const collectAllProjectTasks = (allTasks: Task[], rootProjectId: string): Task[] => {
    const result: Task[] = [];
    const visited = new Set<string>();

    const dfs = (parentId: string) => {
      const children = allTasks.filter((t) => t.parent_task_id === parentId);

      for (const child of children) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        result.push(child);
        dfs(child.id);
      }
    };

    const projectTask = allTasks.find((t) => t.id === rootProjectId);
    if (projectTask) {
      visited.add(projectTask.id);
      result.push(projectTask);
    }

    dfs(rootProjectId);

    return result;
  };

  const loadAssignments = React.useCallback(async () => {
    try {
      const allTasks = await taskService.getTasks();

      const relatedTasks = collectAllProjectTasks(allTasks, projectId);
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
    if (!user) return 'Unknown';
    const fullName = [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ');
    return fullName || user.username || 'Unknown';
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

  return (
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
            onChange={(e) => setFormData({ ...formData, task_id: e.target.value })}
            required
          />

          <Select
            label="Пользователь"
            options={MOCK_USERS
              .filter((u) => projectMembers.includes(u.id))
              .map((u) => ({
                value: u.id,
                label: [u.last_name, u.first_name].filter(Boolean).join(' ') || u.username,
              }))}
            value={formData.user_id}
            onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
            required
          />

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
  );
};
