import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import type { Task } from '../types';
import { TaskDetailView } from './TaskDetailView';
import './TaskDetailModal.scss';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  loading?: boolean;
  onClose: () => void;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  loading = false,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const [notesOpen, setNotesOpen] = useState(false);
  const [notesText, setNotesText] = useState('');

  useEffect(() => {
    if (task) {
      const saved = localStorage.getItem(`task_notes_${task.id}`);
      setNotesText(saved || '');
    }
  }, [task]);

  const handleSaveNotes = () => {
    if (task) {
      localStorage.setItem(`task_notes_${task.id}`, notesText);
    }
    setNotesOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Детали задачи">
        <div className="task-detail-modal__content">
          {loading && (
            <div className="task-detail-modal__center">
              <Loader text="Загрузка данных задачи..." />
            </div>
          )}

          {!loading && task && (
            <>
              <TaskDetailView task={task} />

              <div className="task-detail-modal__actions">
                {onEdit && (
                  <Button variant="primary" onClick={() => onEdit(task.id)}>
                    Редактировать
                  </Button>
                )}

                {onDelete && (
                  <Button variant="danger" onClick={() => setShowConfirm(true)}>
                    Удалить
                  </Button>
                )}

                <Button variant="secondary" onClick={() => setNotesOpen(true)}>
                  Заметки
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={notesOpen}
        onClose={() => setNotesOpen(false)}
        title="Заметки"
      >
        <div className="notes-modal">
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Введите заметки..."
            className="notes-modal__textarea"
          />

          <div className="notes-modal__actions">
            <Button variant="primary" onClick={handleSaveNotes}>
              Сохранить
            </Button>

            <Button variant="outline" onClick={() => setNotesOpen(false)}>
              Закрыть
            </Button>
          </div>
        </div>
      </Modal>

      {/* Подтверждение удаления */}
      {showConfirm && (
        <Modal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          title="Подтверждение удаления"
        >
          <div className="task-detail-modal__confirm">
            <p>Вы уверены, что хотите удалить эту задачу?</p>

            <div className="task-detail-modal__actions">
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>
                Отмена
              </Button>

              <Button
                variant="danger"
                onClick={() => {
                  if (task) {
                    setShowConfirm(false);
                    onDelete?.(task.id);
                  }
                }}
              >
                Удалить
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
