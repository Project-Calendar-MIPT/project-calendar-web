import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Modal } from './ui/Modal';
import { assignmentService } from '../minimal_test/api/assignmentService';
import { userService } from '../minimal_test/api/userService';
import { taskService } from '../api/taskService';
import { apiClient } from '../api/client';
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

export const AssignmentManager: React.FC<AssignmentManagerProps> = ({
  projectId,
  onAssignmentChange,
}) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [, setProjectTasks] = useState<Task[]>([]);
  const [assignableTasks, setAssignableTasks] = useState<Task[]>([]);
  const [, setProjectMembers] = useState<string[]>([]);
  const [displayMembers, setDisplayMembers] = useState<MemberItem[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [memberUsers, setMemberUsers] = useState<User[]>([]);

  // Assign to task modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    task_id: '',
    user_id: '',
    role: 'executor',
    allocated_hours: 0,
  });
  const [error, setError] = useState('');

  // Invite user modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<User[]>([]);
  const [inviteRole, setInviteRole] = useState('executor');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const navigate = useNavigate();

  const rolePriority: Record<string, number> = {
    owner: 5,
    supervisor: 4,
    hybrid: 3,
    executor: 2,
    spectator: 1,
  };

  const fetchUserName = useCallback(async (userId: string): Promise<string> => {
    try {
      const resp = await apiClient.get<any>(`/users/${userId}`);
      const u = resp.data;
      return u.display_name || [u.surname, u.name].filter(Boolean).join(' ') || u.email || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }, []);

  const collectAllProjectTasks = (allTasks: Task[], rootProjectId: string): Task[] => {
    const result: Task[] = [];
    const visited = new Set<string>();
    const dfs = (parentId: string) => {
      for (const child of allTasks.filter((t) => t.parent_task_id === parentId)) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        result.push(child);
        dfs(child.id);
      }
    };
    const projectTask = allTasks.find((t) => t.id === rootProjectId);
    if (projectTask) { visited.add(projectTask.id); result.push(projectTask); }
    dfs(rootProjectId);
    return result;
  };

  const loadAssignments = useCallback(async () => {
    try {
      const allTasks = await taskService.getTasks();
      const relatedTasks = collectAllProjectTasks(allTasks, projectId);
      setProjectTasks(relatedTasks);

      const allAssignments: Assignment[] = [];
      for (const task of relatedTasks) {
        const ta = await assignmentService.getAssignments(task.id);
        allAssignments.push(...ta);
      }
      setAssignments(allAssignments);

      const projectAssignments = await assignmentService.getAssignments(projectId);
      const memberIds = projectAssignments.map((a) => a.user_id);
      setProjectMembers(memberIds);

      const availableTasks = relatedTasks.filter(
        (t) => t.id !== projectId && t.status !== 'completed' && t.status !== 'cancelled'
      );
      setAssignableTasks(availableTasks);

      const uniqueMembersMap = new Map<string, MemberItem>();
      allAssignments.forEach((assignment) => {
        const existing = uniqueMembersMap.get(assignment.user_id);
        if (!existing) {
          uniqueMembersMap.set(assignment.user_id, { user_id: assignment.user_id, role: assignment.role });
          return;
        }
        const cur = rolePriority[assignment.role] || 0;
        const prev = rolePriority[existing.role] || 0;
        if (cur > prev) uniqueMembersMap.set(assignment.user_id, { user_id: assignment.user_id, role: assignment.role });
      });
      const members = Array.from(uniqueMembersMap.values());
      setDisplayMembers(members);

      // Fetch display names for all unique user IDs
      const uniqueIds = Array.from(new Set(allAssignments.map((a) => a.user_id)));
      const names: Record<string, string> = {};
      await Promise.all(uniqueIds.map(async (uid) => {
        names[uid] = await fetchUserName(uid);
      }));
      setUserMap(names);

      // Fetch full user objects for project members (for dropdown in assign modal)
      const users: User[] = await Promise.all(
        memberIds.map(async (uid) => {
          try {
            const resp = await apiClient.get<any>(`/users/${uid}`);
            const u = resp.data;
            return {
              id: uid,
              username: u.display_name ?? u.email ?? '',
              email: u.email ?? '',
              first_name: u.name ?? '',
              last_name: u.surname ?? '',
              timezone: u.timezone ?? 'Europe/Moscow',
              contacts_visible: true,
            } as User;
          } catch { return null; }
        })
      ).then((arr) => arr.filter(Boolean) as User[]);
      setMemberUsers(users);
    } catch (err) {
      console.error('Ошибка при загрузке назначений:', err);
    }
  }, [projectId, fetchUserName]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.task_id) { setError('Выберите задачу'); return; }
    if (!formData.user_id) { setError('Выберите пользователя'); return; }
    try {
      await assignmentService.assignUser(formData.task_id, {
        user_id: formData.user_id,
        role: formData.role as any,
        allocated_hours: formData.allocated_hours,
      });
      await loadAssignments();
      onAssignmentChange?.();
      setIsModalOpen(false);
      setFormData({ task_id: '', user_id: '', role: 'executor', allocated_hours: 0 });
    } catch (err: any) {
      setError(err.message || 'Ошибка при назначении');
    }
  };

  const handleInviteSearch = async () => {
    if (inviteQuery.length < 2) return;
    setInviteLoading(true);
    const results = await userService.searchUsers(inviteQuery);
    setInviteResults(results);
    setInviteLoading(false);
  };

  const handleInviteUser = async (user: User) => {
    setInviteError('');
    try {
      await assignmentService.assignUser(projectId, {
        user_id: user.id,
        role: inviteRole as any,
        allocated_hours: 0,
      });
      await loadAssignments();
      onAssignmentChange?.();
      setIsInviteOpen(false);
      setInviteQuery('');
      setInviteResults([]);
    } catch (err: any) {
      setInviteError(err.response?.data || err.message || 'Ошибка при добавлении');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const userAssignments = assignments.filter((a) => a.user_id === userId && a.role !== 'owner');
      for (const assignment of userAssignments) {
        await assignmentService.removeAssignment(assignment.task_id, assignment.user_id);
      }
      await loadAssignments();
      onAssignmentChange?.();
    } catch (err) {
      console.error('Ошибка при удалении участника:', err);
    }
  };

  const getUserName = (userId: string): string => userMap[userId] || 'Unknown';

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      owner: 'Владелец', supervisor: 'Руководитель', executor: 'Исполнитель',
      hybrid: 'Гибридная', spectator: 'Наблюдатель',
    };
    return labels[role] || role;
  };

  return (
    <div className="assignment-manager">
      <div className="assignment-manager__header">
        <h3>Назначения</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={() => setIsInviteOpen(true)} variant="primary" size="sm">
            + Пригласить
          </Button>
          <Button onClick={() => setIsModalOpen(true)} variant="outline" size="sm">
            Назначить на задачу
          </Button>
        </div>
      </div>

      {displayMembers.length > 0 ? (
        <div className="assignment-manager__list">
          {displayMembers.map((member) => (
            <div key={member.user_id} className="assignment-manager__item">
              <div className="assignment-manager__info">
                <span
                  className="assignment-manager__user assignment-manager__user--link"
                  onClick={() => navigate(`/users/${member.user_id}`)}
                >
                  {getUserName(member.user_id)}
                </span>
                <span className="assignment-manager__role">{getRoleLabel(member.role)}</span>
              </div>
              {member.role !== 'owner' && (
                <Button onClick={() => handleRemoveMember(member.user_id)} variant="danger" size="sm">
                  Удалить
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="assignment-manager__empty">Никого не назначено</p>
      )}

      {/* Invite user modal */}
      <Modal isOpen={isInviteOpen} onClose={() => { setIsInviteOpen(false); setInviteQuery(''); setInviteResults([]); setInviteError(''); }} title="Пригласить пользователя" size="md">
        <div className="assignment-manager__form">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <Input
              label="Имя или email"
              value={inviteQuery}
              onChange={(e) => setInviteQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInviteSearch()}
              placeholder="Введите имя или email..."
            />
            <Button onClick={handleInviteSearch} variant="primary" size="sm" disabled={inviteLoading}>
              {inviteLoading ? '...' : 'Найти'}
            </Button>
          </div>

          <Select
            label="Роль"
            options={ROLE_OPTIONS}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
          />

          {inviteResults.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {inviteResults.map((user) => (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-surface)', borderRadius: '6px' }}>
                  <div>
                    <div>{user.username || [user.last_name, user.first_name].filter(Boolean).join(' ')}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{user.email}</div>
                  </div>
                  <Button onClick={() => handleInviteUser(user)} variant="primary" size="sm">
                    Добавить
                  </Button>
                </div>
              ))}
            </div>
          )}

          {inviteResults.length === 0 && inviteQuery.length >= 2 && !inviteLoading && (
            <p style={{ opacity: 0.6, marginTop: '8px' }}>Пользователи не найдены</p>
          )}

          {inviteError && <div className="assignment-manager__error">{inviteError}</div>}
        </div>
      </Modal>

      {/* Assign to task modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Назначить на задачу" size="md">
        <form onSubmit={handleAssignUser} className="assignment-manager__form">
          <Select
            label="Задача"
            options={assignableTasks.map((t) => ({ value: t.id, label: t.title }))}
            value={formData.task_id}
            onChange={(e) => setFormData({ ...formData, task_id: e.target.value })}
            required
          />
          <Select
            label="Пользователь"
            options={memberUsers.map((u) => ({
              value: u.id,
              label: u.username || [u.last_name, u.first_name].filter(Boolean).join(' ') || u.email,
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
            onChange={(e) => setFormData({ ...formData, allocated_hours: parseFloat(e.target.value) || 0 })}
          />
          {error && <div className="assignment-manager__error">{error}</div>}
          <div className="assignment-manager__actions">
            <Button type="submit" variant="primary">Назначить</Button>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Отмена</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
