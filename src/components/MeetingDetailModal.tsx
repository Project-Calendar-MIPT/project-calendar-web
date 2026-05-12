import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import type { Meeting } from "../api/meetingService";

interface MeetingDetailModalProps {
  meeting: Meeting | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (meetingId: string) => void;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

export const MeetingDetailModal: React.FC<MeetingDetailModalProps> = ({
  meeting,
  isOpen,
  onClose,
  onDelete,
}) => {
  const [showConfirm, setShowConfirm] = React.useState(false);

  if (!isOpen || !meeting) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Детали созвона">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
            {meeting.title}
          </h2>

          {meeting.description && (
            <div
              style={{
                background: "#f8f9fa",
                borderRadius: "10px",
                padding: "14px 16px",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "6px" }}>Описание</div>
              <div style={{ color: "#555" }}>{meeting.description}</div>
            </div>
          )}

          <div
            style={{
              background: "#f8f9fa",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "2px" }}>Параметры</div>

            <Row label="Начало" value={formatDateTime(meeting.start_at)} />
            <Row label="Длительность" value={formatDuration(meeting.duration_min)} />

            {meeting.location && (
              <Row label="Место" value={meeting.location} />
            )}

            {meeting.meeting_url && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#666" }}>Ссылка</span>
                <a
                  href={meeting.meeting_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#7c3aed", fontWeight: 500 }}
                >
                  Открыть →
                </a>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            {meeting.is_organizer && onDelete && (
              <Button variant="danger" onClick={() => setShowConfirm(true)}>
                Удалить
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      </Modal>

      {showConfirm && (
        <Modal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          title="Подтверждение удаления"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p>Вы уверены, что хотите удалить этот созвон?</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>
                Отмена
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setShowConfirm(false);
                  onDelete?.(meeting.id);
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

const Row = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span style={{ color: "#666" }}>{label}</span>
    <span style={{ fontWeight: 500 }}>{value}</span>
  </div>
);
