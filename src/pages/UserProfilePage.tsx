import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { Header } from '../components/Header';
import './ProfilePage.scss';

const DAY_NAMES: Record<number, string> = {
  1: 'Понедельник', 2: 'Вторник', 3: 'Среда',
  4: 'Четверг', 5: 'Пятница', 6: 'Суббота', 7: 'Воскресенье',
};

export const UserProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const [userResp, schedResp] = await Promise.all([
          apiClient.get<any>(`/users/${id}`),
          apiClient.get<any[]>(`/users/${id}/work-schedule`).catch(() => ({ data: [] })),
        ]);
        setUser(userResp.data);
        setSchedule(schedResp.data || []);
      } catch {
        setError('Пользователь не найден');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return (
    <>
      <Header />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Loader />
      </div>
    </>
  );

  if (error || !user) return (
    <>
      <Header />
      <div className="profile-page">
        <p style={{ color: 'var(--color-text-secondary)' }}>{error || 'Пользователь не найден'}</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: '16px', cursor: 'pointer' }}>← Назад</button>
      </div>
    </>
  );

  const displayName = user.display_name || [user.surname, user.name].filter(Boolean).join(' ') || user.email;

  return (
    <>
      <Header />
      <div className="profile-page">
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '14px' }}
        >
          ← Назад
        </button>

        <Card className="profile-page__card">
          <div className="profile-page__header">
            <div className="profile-page__avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="profile-page__name">{displayName}</h2>
              <p className="profile-page__email">{user.email}</p>
            </div>
          </div>

          <div className="profile-page__section">
            <h3 className="profile-page__section-title">Контакты</h3>
            <div className="profile-page__info-grid">
              {user.phone && (
                <div className="profile-page__info-item">
                  <span className="profile-page__info-label">Телефон</span>
                  <span className="profile-page__info-value">{user.phone}</span>
                </div>
              )}
              {user.telegram && (
                <div className="profile-page__info-item">
                  <span className="profile-page__info-label">Telegram</span>
                  <span className="profile-page__info-value">{user.telegram}</span>
                </div>
              )}
              {user.locale && (
                <div className="profile-page__info-item">
                  <span className="profile-page__info-label">Локаль</span>
                  <span className="profile-page__info-value">{user.locale}</span>
                </div>
              )}
            </div>
          </div>

          {schedule.length > 0 && (
            <div className="profile-page__section">
              <h3 className="profile-page__section-title">Рабочий график</h3>
              <div className="profile-page__schedule">
                {schedule.map((day: any) => (
                  <div key={day.weekday} className="profile-page__schedule-day">
                    <span className="profile-page__schedule-name">
                      {DAY_NAMES[day.weekday] || `День ${day.weekday}`}
                    </span>
                    {day.start_time && day.end_time ? (
                      <span className="profile-page__schedule-time">
                        {day.start_time} — {day.end_time}
                      </span>
                    ) : (
                      <span className="profile-page__schedule-off">Выходной</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};
