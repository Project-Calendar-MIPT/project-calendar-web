import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Loader } from '../components/ui/Loader';
import { TaskForm } from '../components/TaskForm';
import { TaskTree } from '../components/TaskTree';
import { AssignmentManager } from '../components/AssignmentManager';
import { taskService } from '../api/taskService';
import { assignmentService } from '../api/assignmentService';
import type { Task } from '../types';
import './ProjectDetailPage.scss';

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

const getProjectDurationDays = (project: Task): number => {
  if (typeof project.duration_days === 'number' && project.duration_days > 0) {
    return project.duration_days;
  }

  const start = new Date(project.start_date);
  const end = new Date(project.end_date);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff) || diff < 0) {
    return 0;
  }

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [memberCount, setMemberCount] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [taskTreeRefreshKey, setTaskTreeRefreshKey] = useState(0);

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const [data, allTasks] = await Promise.all([
        taskService.getTask(id!),
        taskService.getTasks(),
      ]);
      setProject(data);

      const relatedTasks = collectAllProjectTasks(allTasks, id!);
      setProjectTasks(relatedTasks);

      // Count unique members via real API
      try {
        const memberSet = new Set<string>();
        await Promise.all(
          relatedTasks.map(async (task) => {
            const taskAssignments = await assignmentService.getAssignments(task.id);
            taskAssignments.forEach((a) => memberSet.add(a.user_id));
          })
        );
        setMemberCount(memberSet.size);
      } catch {
        // non-critical — ignore member count error
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке проекта');
    } finally {
      setLoading(false);
    }
  };

  const nestedTasks = useMemo(
    () => projectTasks.filter((task) => task.id !== project?.id),
    [projectTasks, project?.id]
  );

  const completedTasksCount = useMemo(
    () => nestedTasks.filter((task) => task.status === 'completed').length,
    [nestedTasks]
  );

  const progress = useMemo(() => {
    if (nestedTasks.length === 0) return 0;
    return Math.round((completedTasksCount / nestedTasks.length) * 100);
  }, [nestedTasks.length, completedTasksCount]);

  const handleCreateTask = async (formData: any) => {
    try {
      const parentId = selectedTask ? selectedTask.id : id;
      const { assignee_id, ...taskData } = formData;

      const createdTask = await taskService.createTask({
        ...taskData,
        parent_task_id: parentId,
      });

      if (assignee_id && (taskData.start_date || taskData.end_date)) {
        await assignmentService.assignUser(createdTask.id, {
          user_id: assignee_id,
          role: 'executor',
          allocated_hours: taskData.estimated_hours || 0,
        });
      }

      await loadProject();
      setTaskTreeRefreshKey((prev) => prev + 1);
      setIsModalOpen(false);
      setSelectedTask(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании задачи');
    }
  };

  const handleTaskSelect = (task: Task | null) => {
    setSelectedTask(task);
  };

  const handleAddSubtask = (parentTask: Task) => {
    setSelectedTask(parentTask);
    setIsModalOpen(true);
  };

  const handleAssignmentChange = () => {
    loadProject();
    setTaskTreeRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="project-detail-page">
        <Loader size="lg" text="Загрузка проекта..." />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-page">
        <div className="project-detail-page__error">Проект не найден</div>
        <Button onClick={() => navigate('/')}>Вернуться к проектам</Button>
      </div>
    );
  }

  return (
    <div className="project-detail-page">
      <div className="project-detail-page__breadcrumbs">
        <button onClick={() => navigate('/')} className="project-detail-page__breadcrumb-link">
          Проекты
        </button>
        <span className="project-detail-page__breadcrumb-separator">/</span>
        <span>{project.title}</span>
      </div>

      <div className="project-detail-page__header">
        <div className="project-detail-page__header-content">
          <h1>{project.title}</h1>
          <p className="project-detail-page__description">{project.description}</p>

          <div className="project-detail-page__summary-grid">
            <div className="project-detail-page__summary-card">
              <div className="project-detail-page__summary-label">Сроки проекта</div>
              <div className="project-detail-page__summary-value">
                {project.start_date} — {project.end_date}
              </div>
            </div>
            <div className="project-detail-page__summary-card">
              <div className="project-detail-page__summary-label">Время реализации</div>
              <div className="project-detail-page__summary-value">
                {getProjectDurationDays(project)} дн.
              </div>
            </div>
            <div className="project-detail-page__summary-card">
              <div className="project-detail-page__summary-label">Участников</div>
              <div className="project-detail-page__summary-value">{memberCount}</div>
            </div>
            <div className="project-detail-page__summary-card">
              <div className="project-detail-page__summary-label">Задач выполнено</div>
              <div className="project-detail-page__summary-value">
                {completedTasksCount} / {nestedTasks.length}
              </div>
            </div>
          </div>

          <div className="project-detail-page__progress-block">
            <div className="project-detail-page__progress-head">
              <span>Timeline / прогресс выполнения</span>
              <strong>{progress}%</strong>
            </div>
            <div className="project-detail-page__progress-bar">
              <div
                className="project-detail-page__progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <Button onClick={() => setIsModalOpen(true)} variant="primary" size="lg">
          + Создать {selectedTask ? 'подзадачу' : 'задачу'}
        </Button>
      </div>

      {error && <div className="project-detail-page__error">{error}</div>}

      <div className="project-detail-page__tasks">
        <h2>Задачи</h2>
        {id && (
          <TaskTree
            key={taskTreeRefreshKey}
            taskId={id}
            onTaskSelect={handleTaskSelect}
            onAddSubtask={handleAddSubtask}
          />
        )}
      </div>

      <div className="project-detail-page__assignments">
        <h2>Участники</h2>
        {id && (
          <AssignmentManager
            projectId={id}
            onAssignmentChange={handleAssignmentChange}
          />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedTask ? `Создать подзадачу для "${selectedTask.title}"` : 'Создать задачу'}
        size="md"
      >
        <TaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setIsModalOpen(false)}
          projectStartDate={project.start_date}
          projectEndDate={project.end_date}
          projectId={project.id}
        />
      </Modal>
    </div>
  );
};

export default ProjectDetailPage;
