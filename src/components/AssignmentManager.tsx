import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Modal } from "./ui/Modal";
import { assignmentService } from "../api/assignmentService";
import { userService } from "../api/userService";
import { taskService } from "../api/taskService";
import { apiClient } from "../api/client";
import type { Assignment, Task, User } from "../types";
import "./AssignmentManager.scss";

interface AssignmentManagerProps {
  projectId: string;
  onAssignmentChange?: () => void;
}

const ROLE_OPTIONS = [
  { value: "supervisor", label: "Руководитель" },
  { value: "executor", label: "Исполнитель" },
  { value: "hybrid", label: "Гибридная" },
  { value: "spectator", label: "Наблюдатель" },
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

  const normalizedStart = start || end || "";
  const normalizedEnd = end || start || "";

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
  bEnd?: string,
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
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [memberUsers, setMemberUsers] = useState<User[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [candidateProfiles, setCandidateProfiles] = useState<
    Record<string, CandidateProfile>
  >({});
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  // Assign to task modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    task_id: "",
    user_id: "",
    role: "executor",
    allocated_hours: 0,
  });
  const [error, setError] = useState("");

  // Invite user modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<User[]>([]);
  const [inviteRole, setInviteRole] = useState("executor");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const navigate = useNavigate();

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

  const fetchUserName = useCallback(async (userId: string): Promise<string> => {
    try {
      const resp = await apiClient.get<any>(`/users/${userId}`);
      const u = resp.data;
      return (
        u.display_name ||
        [u.surname, u.name].filter(Boolean).join(" ") ||
        u.email ||
        "Unknown"
      );
    } catch {
      return "Unknown";
    }
  }, []);

  const collectAllProjectTasks = (
    tasks: Task[],
    rootProjectId: string,
  ): Task[] => {
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

  const loadAssignments = useCallback(async () => {
    try {
      const fetchedTasks = await taskService.getTasks();
      setAllTasks(fetchedTasks);
      const relatedTasks = collectAllProjectTasks(fetchedTasks, projectId);
      setProjectTasks(relatedTasks);

      const allAssignments: Assignment[] = [];
      for (const task of relatedTasks) {
        const ta = await assignmentService.getAssignments(task.id);
        allAssignments.push(...ta);
      }
      setAssignments(allAssignments);

      const projectAssignments =
        await assignmentService.getAssignments(projectId);
      const memberIds = projectAssignments.map((a) => a.user_id);
      setProjectMembers(memberIds);

      const availableTasks = relatedTasks.filter(
        (t) =>
          t.id !== projectId &&
          t.status !== "completed" &&
          t.status !== "cancelled",
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
        const cur = rolePriority[assignment.role] || 0;
        const prev = rolePriority[existing.role] || 0;
        if (cur > prev)
          uniqueMembersMap.set(assignment.user_id, {
            user_id: assignment.user_id,
            role: assignment.role,
          });
      });
      const members = Array.from(uniqueMembersMap.values());
      setDisplayMembers(members);

      // Fetch display names for all unique user IDs
      const uniqueIds = Array.from(
        new Set(allAssignments.map((a) => a.user_id)),
      );
      const names: Record<string, string> = {};
      await Promise.all(
        uniqueIds.map(async (uid) => {
          names[uid] = await fetchUserName(uid);
        }),
      );
      setUserMap(names);

      // Fetch full user objects for project members (for dropdowns)
      const users: User[] = await Promise.all(
        memberIds.map(async (uid) => {
          try {
            const resp = await apiClient.get<any>(`/users/${uid}`);
            const u = resp.data;
            return {
              id: uid,
              username: u.display_name ?? u.email ?? "",
              email: u.email ?? "",
              first_name: u.name ?? "",
              last_name: u.surname ?? "",
              timezone: u.timezone ?? "Europe/Moscow",
              contacts_visible: true,
            } as User;
          } catch {
            return null;
          }
        }),
      ).then((arr) => arr.filter(Boolean) as User[]);
      setMemberUsers(users);
    } catch (err) {
      console.error("Ошибка при загрузке назначений:", err);
    }
  }, [projectId, fetchUserName]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // Compute available users and candidate profiles based on selected task dates
  useEffect(() => {
    const selectedTask = projectTasks.find(
      (task) => task.id === formData.task_id,
    );

    if (!selectedTask) {
      setAvailableUsers([]);
      setCandidateProfiles({});
      setFormData((prev) => ({ ...prev, user_id: "" }));
      return;
    }

    if (!selectedTask.start_date && !selectedTask.end_date) {
      // No dates — all members are available
      const profiles: Record<string, CandidateProfile> = {};
      memberUsers.forEach((user) => {
        profiles[user.id] = { user, activeTasks: [], overlappingTasks: [] };
      });
      setAvailableUsers(memberUsers);
      setCandidateProfiles(profiles);
      return;
    }

    // Filter by date availability using real assignments data
    const profiles: Record<string, CandidateProfile> = {};
    const freeUsers: User[] = [];

    for (const user of memberUsers) {
      const userAssignments = assignments.filter((a) => a.user_id === user.id);

      const activeTasks = userAssignments
        .map((a) => allTasks.find((t) => t.id === a.task_id))
        .filter((t): t is Task => Boolean(t))
        .filter(
          (t) =>
            t.id !== selectedTask.id &&
            t.parent_task_id !== null &&
            t.status !== "completed" &&
            t.status !== "cancelled",
        );

      const overlappingTasks = activeTasks.filter((t) =>
        hasDateOverlap(
          selectedTask.start_date,
          selectedTask.end_date,
          t.start_date,
          t.end_date,
        ),
      );

      profiles[user.id] = { user, activeTasks, overlappingTasks };

      if (overlappingTasks.length === 0) {
        freeUsers.push(user);
      }
    }

    setCandidateProfiles(profiles);
    setAvailableUsers(freeUsers);

    setFormData((prev) => {
      if (!prev.user_id) return prev;
      const stillAvailable = freeUsers.some((u) => u.id === prev.user_id);
      return stillAvailable ? prev : { ...prev, user_id: "" };
    });
  }, [
    formData.task_id,
    projectMembers,
    projectTasks,
    allTasks,
    memberUsers,
    assignments,
  ]);

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.task_id) {
      setError("Выберите задачу");
      return;
    }
    if (!formData.user_id) {
      setError("Выберите пользователя");
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
        task_id: "",
        user_id: "",
        role: "executor",
        allocated_hours: 0,
      });
      setAvailableUsers([]);
      setCandidateProfiles({});
    } catch (err: any) {
      setError(err.message || "Ошибка при назначении");
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
    setInviteError("");
    try {
      await assignmentService.assignUser(projectId, {
        user_id: user.id,
        role: inviteRole as any,
        allocated_hours: 0,
      });
      await loadAssignments();
      onAssignmentChange?.();
      setIsInviteOpen(false);
      setInviteQuery("");
      setInviteResults([]);
    } catch (err: any) {
      setInviteError(
        err.response?.data || err.message || "Ошибка при добавлении",
      );
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const userAssignments = assignments.filter(
        (a) => a.user_id === userId && a.role !== "owner",
      );
      for (const assignment of userAssignments) {
        await assignmentService.removeAssignment(
          assignment.task_id,
          assignment.user_id,
        );
      }
      await loadAssignments();
      onAssignmentChange?.();
    } catch (err) {
      console.error("Ошибка при удалении участника:", err);
    }
  };

  const getUserName = (userId: string): string => userMap[userId] || "Unknown";

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      owner: "Владелец",
      supervisor: "Руководитель",
      executor: "Исполнитель",
      hybrid: "Гибридная",
      spectator: "Наблюдатель",
    };
    return labels[role] || role;
  };

  const selectedTask = projectTasks.find((t) => t.id === formData.task_id);
  const selectedTaskHasDates = Boolean(
    selectedTask?.start_date || selectedTask?.end_date,
  );
  const usersForDropdown = selectedTaskHasDates ? availableUsers : memberUsers;

  return (
    <>
      <div className="assignment-manager">
        <div className="assignment-manager__header">
          <h3>Назначения</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              onClick={() => setIsInviteOpen(true)}
              variant="primary"
              size="sm"
            >
              + Пригласить
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="outline"
              size="sm"
            >
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
                  <span className="assignment-manager__role">
                    {getRoleLabel(member.role)}
                  </span>
                </div>
                {member.role !== "owner" && (
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

        {/* Invite user modal */}
        <Modal
          isOpen={isInviteOpen}
          onClose={() => {
            setIsInviteOpen(false);
            setInviteQuery("");
            setInviteResults([]);
            setInviteError("");
          }}
          title="Пригласить пользователя"
          size="md"
        >
          <div className="assignment-manager__form">
            <div
              style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}
            >
              <Input
                label="Имя или email"
                value={inviteQuery}
                onChange={(e) => setInviteQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInviteSearch()}
                placeholder="Введите имя или email..."
              />
              <Button
                onClick={handleInviteSearch}
                variant="primary"
                size="sm"
                disabled={inviteLoading}
              >
                {inviteLoading ? "..." : "Найти"}
              </Button>
            </div>

            <Select
              label="Роль"
              options={ROLE_OPTIONS}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            />

            {inviteResults.length > 0 && (
              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {inviteResults.map((user) => (
                  <div
                    key={user.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "var(--color-surface)",
                      borderRadius: "6px",
                    }}
                  >
                    <div>
                      <div>
                        {user.username ||
                          [user.last_name, user.first_name]
                            .filter(Boolean)
                            .join(" ")}
                      </div>
                      <div style={{ fontSize: "12px", opacity: 0.6 }}>
                        {user.email}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleInviteUser(user)}
                      variant="primary"
                      size="sm"
                    >
                      Добавить
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {inviteResults.length === 0 &&
              inviteQuery.length >= 2 &&
              !inviteLoading && (
                <p style={{ opacity: 0.6, marginTop: "8px" }}>
                  Пользователи не найдены
                </p>
              )}

            {inviteError && (
              <div className="assignment-manager__error">{inviteError}</div>
            )}
          </div>
        </Modal>

        {/* Assign to task modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Назначить на задачу"
          size="md"
        >
          <form
            onSubmit={handleAssignUser}
            className="assignment-manager__form"
          >
            <Select
              label="Задача"
              options={assignableTasks.map((t) => ({
                value: t.id,
                label: t.title,
              }))}
              value={formData.task_id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  task_id: e.target.value,
                  user_id: "",
                })
              }
              required
            />

            <Select
              label="Пользователь"
              options={usersForDropdown.map((u) => ({
                value: u.id,
                label:
                  u.username ||
                  [u.last_name, u.first_name].filter(Boolean).join(" ") ||
                  u.email,
              }))}
              value={formData.user_id}
              onChange={(e) =>
                setFormData({ ...formData, user_id: e.target.value })
              }
              required
            />

            {selectedTaskHasDates && (
              <div className="assignment-manager__hint">
                {availableUsers.length > 0
                  ? `Доступно сотрудников: ${availableUsers.length}`
                  : "Нет свободных сотрудников на даты выбранной задачи"}
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
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Отмена
              </Button>
            </div>
          </form>
        </Modal>
      </div>

      {/* Candidate profile modal */}
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
              <span>
                {[
                  selectedProfile.user.last_name,
                  selectedProfile.user.first_name,
                ]
                  .filter(Boolean)
                  .join(" ") || selectedProfile.user.username}
              </span>
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
                  <span className="candidate-profile__empty">
                    Нет активных задач
                  </span>
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
