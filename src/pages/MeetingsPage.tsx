import React, { useEffect, useState } from "react";
import { meetingService, type Meeting, type CreateMeetingData } from "../api/meetingService";
import { userService } from "../api/userService";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import "./MeetingsPage.scss";

type MeetingType = "online" | "offline";

export const MeetingsPage: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [subordinates, setSubordinates] = useState<
    { id: string; display_name: string; email: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt]         = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [meetingType, setMeetingType] = useState<MeetingType>("online");
  const [meetingUrl, setMeetingUrl]   = useState("");
  const [location, setLocation]       = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState("");

  useEffect(() => {
    Promise.all([
      meetingService.listMeetings(false),
      userService.getSubordinates(),
    ]).then(([m, s]) => {
      setMeetings(m);
      setSubordinates(s);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setTitle(""); setDescription(""); setStartAt("");
    setDurationMin(60); setMeetingType("online");
    setMeetingUrl(""); setLocation("");
    setSelectedIds([]); setFormError("");
  };

  const handleCreate = async () => {
    setFormError("");
    if (!title.trim()) { setFormError("Введите название"); return; }
    if (!startAt)       { setFormError("Выберите дату и время"); return; }
    if (selectedIds.length === 0) { setFormError("Добавьте хотя бы одного участника"); return; }

    const data: CreateMeetingData = {
      title: title.trim(),
      description: description.trim() || undefined,
      start_at: new Date(startAt).toISOString(),
      duration_min: durationMin,
      meeting_url:  meetingType === "online"  ? meetingUrl  : undefined,
      location:     meetingType === "offline" ? location    : undefined,
      participant_ids: selectedIds,
    };

    setSubmitting(true);
    try {
      const created = await meetingService.createMeeting(data);
      setMeetings(prev => [created, ...prev]);
      setShowModal(false);
      resetForm();
    } catch (e: any) {
      setFormError(
        e?.response?.data?.error === "not_subordinate"
          ? "Один из участников не является вашим подчинённым"
          : "Ошибка при создании созвона"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Удалить созвон?")) return;
    try {
      await meetingService.deleteMeeting(id);
      setMeetings(prev => prev.filter(m => m.id !== id));
    } catch {
      alert("Не удалось удалить созвон");
    }
  };

  const toggleParticipant = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("ru-RU", {
        day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Загрузка...</div>;

  return (
    <div className="meetings-page">
      <div className="meetings-page__header">
        <h1>Созвоны</h1>
        {subordinates.length > 0 && (
          <Button onClick={() => setShowModal(true)}>+ Создать созвон</Button>
        )}
      </div>

      {meetings.length === 0 ? (
        <div className="meetings-page__empty">
          <p>Нет запланированных созвонов</p>
          {subordinates.length === 0 && (
            <p style={{ fontSize: 13, marginTop: 8, color: "var(--color-text-secondary)" }}>
              Создать созвон может только руководитель проекта
            </p>
          )}
        </div>
      ) : (
        <div className="meetings-page__list">
          {meetings.map(m => (
            <div key={m.id} className="meetings-page__item">
              <div className="meetings-page__item-header">
                <span className="meetings-page__item-title">{m.title}</span>
                <span className="meetings-page__item-badge">
                  {m.meeting_url ? "Онлайн" : m.location ? `Оффлайн: ${m.location}` : "Созвон"}
                </span>
              </div>
              <div className="meetings-page__item-meta">
                {formatDate(m.start_at)} · {m.duration_min} мин
              </div>
              {m.description && (
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                  {m.description}
                </div>
              )}
              {m.meeting_url && (
                <a href={m.meeting_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 13, color: "#6d28d9", wordBreak: "break-all" }}>
                  {m.meeting_url}
                </a>
              )}
              {m.is_organizer && (
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => handleDelete(m.id)}
                    style={{ fontSize: 12, color: "#ef4444", background: "none",
                      border: "none", cursor: "pointer", padding: 0 }}>
                    Удалить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} title="Новый созвон" onClose={() => { setShowModal(false); resetForm(); }}>
        <div>
          <div className="meetings-page__modal-field">
            <label>Название *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Еженедельный синк" />
          </div>

          <div className="meetings-page__modal-field">
            <label>Описание</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Повестка..." />
          </div>

          <div className="meetings-page__modal-field">
            <label>Дата и время *</label>
            <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
          </div>

          <div className="meetings-page__modal-field">
            <label>Длительность</label>
            <select value={durationMin} onChange={e => setDurationMin(Number(e.target.value))}>
              <option value={30}>30 минут</option>
              <option value={60}>1 час</option>
              <option value={90}>1.5 часа</option>
              <option value={120}>2 часа</option>
            </select>
          </div>

          <div className="meetings-page__type-toggle">
            <button className={meetingType === "online" ? "active" : ""}
              onClick={() => setMeetingType("online")}>Онлайн</button>
            <button className={meetingType === "offline" ? "active" : ""}
              onClick={() => setMeetingType("offline")}>Оффлайн</button>
          </div>

          {meetingType === "online" ? (
            <div className="meetings-page__modal-field">
              <label>Ссылка на встречу</label>
              <input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/..." />
            </div>
          ) : (
            <div className="meetings-page__modal-field">
              <label>Кабинет / адрес</label>
              <input value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Переговорная 3-08" />
            </div>
          )}

          <div className="meetings-page__modal-field">
            <label>Участники * (только ваши подчинённые)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160,
              overflowY: "auto", border: "1px solid var(--color-border, #e5e7eb)",
              borderRadius: 6, padding: 8 }}>
              {subordinates.map(s => (
                <label key={s.id} style={{ display: "flex", alignItems: "center",
                  gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={selectedIds.includes(s.id)}
                    onChange={() => toggleParticipant(s.id)} />
                  {s.display_name}
                  <span style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>{s.email}</span>
                </label>
              ))}
            </div>
          </div>

          {formError && (
            <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{formError}</div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Создание..." : "Создать"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MeetingsPage;
