import React, { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Modal } from './ui/Modal';
import { UserSearch } from './UserSearch';
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

const MEMBER_FILTER_OPTIONS = [
  { value: 'all', label: 'Все роли' },
  { value: 'owner', label: 'Владелец' },
  { value: 'supervisor', label: 'Руководитель' },
  { value: 'executor', label: 'Исполнитель' },
  { value: 'hybrid', label: 'Гибридная' },
  { value: 'spectator', label: 'Наблюдатель' },
];

const MEMBER_SORT_OPTIONS = [
  { value: 'role', label: 'Сначала по роли' },
  { value: 'name', label: 'По имени' },
  { value: 'load', label: 'По загруженности' },
];

type MemberItem = {
  user_id: string;
  role: string;
};

type CandidateProfile = {
  user: User;
  activeTasks: Task[];
  overlappingTasks: Task[];
  matchedSkills: string[];
  relevanceScore: number;
  workloadLabel: string;
  isAvailable: boolean;
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

const normalizeSkill = (value: string) => value.trim().toLowerCase();

const extractSkillsFromText = (text: string): string[] => {
  const normalized = text.toLowerCase();
  const map: Record<string, string[]> = {
    react: ['react', 'компонент', 'frontend', 'ui'],
    typescript: ['typescript', 'ts'],
    frontend: ['frontend', 'ui', 'modal', 'calendar'],
    backend: ['backend', 'api', 'service'],
    calendar: ['calendar', 'календар'],
    modal: ['modal', 'модаль'],
    testing: ['test', 'тест', 'qa'],
    api: ['api', 'интеграц'],
    auth: ['auth', 'jwt', 'аутентиф'],
    database: ['database', 'sql', 'бд'],
    security: ['security', 'безопас'],
    permissions: ['permission', 'role', 'разрешен'],
    schedule: ['schedule', 'расписан'],
    documentation: ['documentation', 'readme', 'документ'],
    ui: ['button', 'input', 'select', 'ui kit'],
  };

  return Object.entries(map)
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(([skill]) => skill);
};

const getTaskRequiredSkills = (task?: Task | null): string[] => {
  if (!task) return [];
  if (task.required_skills && task.required_skills.length > 0) {
    return task.required_skills.map(normalizeSkill);
  }
  return extractSkillsFromText(`${task.title} ${task.description || ''}`);
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
  const [candidateProfiles, setCandidateProfiles] = useState<Record<string, CandidateProfile>>({});
  const [sortedCandidates, setSortedCandidates] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  // добавлено для блока участников: фильтр и сортировка
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');
  const [memberSortBy, setMemberSortBy] = useState('role');

  const rolePriority: Record<string, number> = {
    owner: 5,
    supervisor: 4,
    hybrid: 3,
    executor: 2,
    spectator: 1,
  };

  const selectedTask = useMemo(
    () => projectTasks.find((task) => task.id === formData.task_id) || null,
    [projectTasks, formData.task_id]
  );

  const selectedProfile = useMemo(() => {
    if (!profileUserId) return null;
    return candidateProfiles[profileUserId] || null;
  }, [candidateProfiles, profileUserId]);

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
    if (!selectedTask) {
      setCandidateProfiles({});
      setSortedCandidates([]);
      setFormData((prev) => ({ ...prev, user_id: '' }));
      return;
    }

    const baseUsers =
      projectMembers.length > 0
        ? MOCK_USERS.filter((user) => projectMembers.includes(user.id))
        : MOCK_USERS;

    const requiredSkills = getTaskRequiredSkills(selectedTask);
    const allAssignments = assignmentService.getMockAssignments();

    const profiles: Record<string, CandidateProfile> = {};
    const sorted = [...baseUsers]
      .map((user) => {
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

        const userSkills = (user.skills || []).map(normalizeSkill);
        const matchedSkills = requiredSkills.filter((skill) => userSkills.includes(skill));
        const relevanceScore = matchedSkills.length;
        const isAvailable = overlappingTasks.length === 0;

        const profile: CandidateProfile = {
          user,
          activeTasks,
          overlappingTasks,
          matchedSkills,
          relevanceScore,
          workloadLabel: `${activeTasks.length} активн. задач`,
          isAvailable,
        };

        profiles[user.id] = profile;
        return profile;
      })
      .sort((a, b) => {
        if (a.isAvailable !== b.isAvailable) {
          return Number(b.isAvailable) - Number(a.isAvailable);
        }
        if (a.relevanceScore !== b.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        if (a.activeTasks.length !== b.activeTasks.length) {
          return a.activeTasks.length - b.activeTasks.length;
        }
        return a.user.full_name.localeCompare(b.user.full_name);
      })
      .map((profile) => profile.user);

    setCandidateProfiles(profiles);
    setSortedCandidates(sorted);

    setFormData((prev) => {
      if (!prev.user_id) return prev;
      return profiles[prev.user_id]?.isAvailable ? prev : { ...prev, user_id: '' };
    });
  }, [selectedTask, projectMembers, allTasks]);

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

    const selectedCandidate = candidateProfiles[formData.user_id];
    if (selectedCandidate && !selectedCandidate.isAvailable) {
      setError('Этот сотрудник занят в выбранные даты');
      return;
    }

    try {
      if (formData.role === 'owner') {
        const existingOwner = assignments.find((a) => a.role === 'owner');
        if (existingOwner) {
          setError('У проекта уже есть владелец');
          return;
        }
      }

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
      setCandidateProfiles({});
      setSortedCandidates([]);
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

  const buildTaskLabel = (task: Task): string => task.title;

  const getMemberAssignmentsCount = (userId: string): number => {
    return assignments.filter((assignment) => assignment.user_id === userId).length;
  };

  const filteredAndSortedMembers = useMemo(() => {
    const filtered = displayMembers.filter((member) => {
      if (memberRoleFilter === 'all') return true;
      return member.role === memberRoleFilter;
    });

    return [...filtered].sort((a, b) => {
      if (memberSortBy === 'name') {
        return getUserName(a.user_id).localeCompare(getUserName(b.user_id));
      }

      if (memberSortBy === 'load') {
        const aCount = getMemberAssignmentsCount(a.user_id);
        const bCount = getMemberAssignmentsCount(b.user_id);

        if (aCount !== bCount) {
          return bCount - aCount;
        }

        return getUserName(a.user_id).localeCompare(getUserName(b.user_id));
      }

      const aPriority = rolePriority[a.role] || 0;
      const bPriority = rolePriority[b.role] || 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return getUserName(a.user_id).localeCompare(getUserName(b.user_id));
    });
  }, [displayMembers, memberRoleFilter, memberSortBy, assignments]);

  return (
    <>
      <div className="assignment-manager">
        <div className="assignment-manager__header">
          <h3>Назначения</h3>
          <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm">
            + Назначить
          </Button>
        </div>

        {displayMembers.length > 0 && (
          <div className="assignment-manager__toolbar">
            <div className="assignment-manager__toolbar-item">
              <Select
                label="Фильтр по роли"
                options={MEMBER_FILTER_OPTIONS}
                value={memberRoleFilter}
                onChange={(e) => setMemberRoleFilter(e.target.value)}
              />
            </div>

            <div className="assignment-manager__toolbar-item">
              <Select
                label="Сортировка"
                options={MEMBER_SORT_OPTIONS}
                value={memberSortBy}
                onChange={(e) => setMemberSortBy(e.target.value)}
              />
            </div>
          </div>
        )}

        {filteredAndSortedMembers.length > 0 ? (
          <div className="assignment-manager__list">
            {filteredAndSortedMembers.map((member) => (
              <div key={member.user_id} className="assignment-manager__item">
                <div className="assignment-manager__info">
                  <span className="assignment-manager__user">
                    {getUserName(member.user_id)}
                  </span>

                  <div className="assignment-manager__meta">
                    <span className="assignment-manager__role">
                      {getRoleLabel(member.role)}
                    </span>
                    <span className="assignment-manager__load">
                      Задач в проекте: {getMemberAssignmentsCount(member.user_id)}
                    </span>
                  </div>
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
        ) : displayMembers.length > 0 ? (
          <p className="assignment-manager__empty">По выбранному фильтру никого нет</p>
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

            {selectedTask && (
              <>
                <div className="assignment-manager__skills">
                  Требуемые навыки:{' '}
                  {getTaskRequiredSkills(selectedTask).length > 0
                    ? getTaskRequiredSkills(selectedTask).join(', ')
                    : 'не определены'}
                </div>

                <UserSearch
                  users={sortedCandidates}
                  candidateMeta={Object.fromEntries(
                    Object.entries(candidateProfiles).map(([id, profile]) => [
                      id,
                      {
                        activeTasksCount: profile.activeTasks.length,
                        overlappingTasksCount: profile.overlappingTasks.length,
                        workloadLabel: profile.workloadLabel,
                        matchedSkills: profile.matchedSkills,
                        relevanceScore: profile.relevanceScore,
                        isAvailable: profile.isAvailable,
                      },
                    ])
                  )}
                  onSelect={(user) => setFormData((prev) => ({ ...prev, user_id: user.id }))}
                  onPreview={(user) => setProfileUserId(user.id)}
                />

                {formData.user_id && (
                  <div className="assignment-manager__selected-user">
                    Выбран: {getUserName(formData.user_id)}
                  </div>
                )}
              </>
            )}

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
              <span className="candidate-profile__label">Ник:</span>
              <span>@{selectedProfile.user.username}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Email:</span>
              <span>{selectedProfile.user.email}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Навыки:</span>
              <span>{(selectedProfile.user.skills || []).join(', ') || 'Не указаны'}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Загруженность:</span>
              <span>{selectedProfile.workloadLabel}</span>
            </div>
            <div className="candidate-profile__row">
              <span className="candidate-profile__label">Совпадение навыков:</span>
              <span>
                {selectedProfile.matchedSkills.length > 0
                  ? selectedProfile.matchedSkills.join(', ')
                  : 'Нет явных совпадений'}
              </span>
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
                На даты выбранной задачи есть пересечения по занятости.
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};
