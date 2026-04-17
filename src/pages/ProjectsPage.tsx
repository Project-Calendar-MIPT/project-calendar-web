import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Loader } from '../components/ui/Loader';
import { EmptyState } from '../components/EmptyState';
import { TaskForm } from '../components/TaskForm';
import { taskService } from '../api/taskService';
import { assignmentService } from '../api/assignmentService';
import { authService } from '../api/authService';
import type { Task } from '../types';
import './ProjectsPage.scss';

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await taskService.getTasks({ parent_task_id: null });
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке проектов');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (formData: any) => {
    try {
      const newProject = await taskService.createTask({
        ...formData,
        parent_task_id: null,
      });

      setProjects((prev) => [...prev, newProject]);
      setIsModalOpen(false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании проекта');
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  if (loading) {
    return (
      <div className="projects-page">
        <Loader size="lg" text="Загрузка проектов..." />
      </div>
    );
  }

  return (
    <div className="projects-page">
      <div className="projects-page__header">
        <div className="projects-page__title-section">
          <h1>Проекты</h1>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" size="lg">
          + Создать проект
        </Button>
      </div>

      {error && <div className="projects-page__error">{error}</div>}

      {projects.length === 0 ? (
        <EmptyState
          title="Нет проектов"
          description="Создайте первый проект, чтобы начать организовывать задачи"
          actionLabel="Создать проект"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="projects-page__grid">
          {projects.map((project) => (
            <Card
              key={project.id}
              title={project.title}
              onClick={() => handleProjectClick(project.id)}
              hoverable
            >
              <p className="projects-page__description">{project.description}</p>
              {/* Для проектов не показываем статус и приоритет */}
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Создать проект"
        size="md"
      >
        <TaskForm
          onSubmit={handleCreateProject}
          onCancel={() => setIsModalOpen(false)}
          isProject={true}
        />
      </Modal>
    </div>
  );
};

export default ProjectsPage;
