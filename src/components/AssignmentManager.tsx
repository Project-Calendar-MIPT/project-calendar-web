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
}

const ROLE_OPTIONS = [
  // owner нельзя назначить вручную
  { value: 'supervisor', label: 'Руководитель' },
  { value: 'executor', label: 'Исполнитель' },
  { value: 'hybrid', label: 'Гибридная' },
  { value: 'spectator', label: 'Наблюдатель' },
];

export const AssignmentManager: React.FC<AssignmentManagerProps> = ({ projectId }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    task_id: '',
    user_id: '',
    role: 'executor',
    allocated_hours: 0,
  });
  const [error, setError] = useState('');

  const loadAssignments = React.useCallback(async () => {
    try {
      // Загружаем все задачи проекта
      const allTasks = await taskService.getTasks();
      const projectTasks = allTasks.filter((t) => 
        t.id === projectId || t.parent_task_id === projectId
      );
      
      // Загружаем назначения для всех задач проекта
      const allAssignments: Assignment[] = [];
      for (const task of projectTasks) {
        const taskAssignments = await assignmentService.getAssignments(task.id);
        allAssignments.push(...taskAssignments);
      }
      setAssignments(allAssignments);
      
      // Получаем список участников проекта (назначенных на сам проект)
      const projectAssignments = await assignmentService.getAssignments(projectId);
      const memberIds = projectAssignments.map(a => a.user_id);
      setProjectMembers(memberIds);
      
      // Фильтруем только задачи со статусом pending
      const pending = projectTasks.filter((t) => t.status === 'pending');
      setPendingTasks(pending);
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
      loadAssignments();
      setIsModalOpen(false);
      setFormData({ task_id: '', user_id: '', role: 'executor', allocated_hours: 0 });
    } catch (err: any) {
      setError(err.message || 'Ошибка при назначении');
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      await assignmentService.removeAssignment(assignmentId);
      loadAssignments();
    } catch (err) {
      console.error('Ошибка при удалении назначения:', err);
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

  return (
    <div className="assignment-manager">
      <div className="assignment-manager__header">
        <h3>Назначения</h3>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm">
          + Назначить
        </Button>
      </div>

      {assignments.length > 0 ? (
        <div className="assignment-manager__list">
          {assignments.map((assignment) => {
            const task = pendingTasks.find(t => t.id === assignment.task_id) || 
                         assignments.find(a => a.id === assignment.task_id);
            return (
              <div key={assignment.id} className="assignment-manager__item">
                <div className="assignment-manager__info">
                  <span className="assignment-manager__user">{getUserName(assignment.user_id)}</span>
                  <span className="assignment-manager__role">{getRoleLabel(assignment.role)}</span>
                  {assignment.allocated_hours > 0 && (
                    <span className="assignment-manager__hours">{assignment.allocated_hours}ч</span>
                  )}
                </div>
                {assignment.role !== 'owner' && (
                  <Button
                    onClick={() => handleRemoveAssignment(assignment.id)}
                    variant="danger"
                    size="sm"
                  >
                    Удалить
                  </Button>
                )}
              </div>
            );
          })}
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
            options={pendingTasks.map((t) => ({
              value: t.id,
              label: t.title,
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
                label: u.full_name,
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
              setFormData({ ...formData, allocated_hours: parseFloat(e.target.value) || 0 })
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
