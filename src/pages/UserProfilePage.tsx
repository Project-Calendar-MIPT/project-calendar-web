import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { userService } from "../api/userService";
import { Card } from "../components/ui/Card";
import { Loader } from "../components/ui/Loader";
import "./ProfilePage.scss";

const DAY_NAMES: Record<number, string> = {
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
  7: "Воскресенье",
};

export const UserProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState<
    { date: string; busy_slots: { start: string; end: string }[] }[]
  >([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const getWeekStart = (offset: number): string => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1 + offset * 7);
    return d.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const [userResp, schedResp] = await Promise.all([
          apiClient.get<any>(`/users/${id}`),
          apiClient
            .get<any[]>(`/users/${id}/work-schedule`)
            .catch(() => ({ data: [] })),
        ]);
        const rawUser = userResp.data?.user ?? userResp.data;
        setUser({
          ...rawUser,
          display_name:
            rawUser.display_name ||
            [rawUser.surname, rawUser.name].filter(Boolean).join(" "),
        });
        setSchedule(
          (schedResp.data || []).map((day: any) => ({
            ...day,
            weekday:
              day.day_of_week ??
              (typeof day.weekday === "number" ? day.weekday + 1 : 1),
          })),
        );
      } catch {
        setError("Пользователь не найден");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    userService.getAvailability(id, getWeekStart(weekOffset))
      .then(setAvailability)
      .catch(() => setAvailability([]));
  }, [id, weekOffset]);

  if (loading)
    return (
      <>
        <div
          style={{ display: "flex", justifyContent: "center", padding: "60px" }}
        >
          <Loader />
        </div>
      </>
    );

  if (error || !user)
    return (
      <>
        <div className="profile-page">
          <p style={{ color: "var(--color-text-secondary)" }}>
            {error || "Пользователь не найден"}
          </p>
          <button
            onClick={() => navigate(-1)}
            style={{ marginTop: "16px", cursor: "pointer" }}
          >
            ← Назад
          </button>
        </div>
      </>
    );

  const displayName =
    user.display_name ||
    [user.surname, user.name].filter(Boolean).join(" ") ||
    user.email;

  return (
    <>
      <div className="profile-page">
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
            marginBottom: "16px",
            fontSize: "14px",
          }}
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
                  <span className="profile-page__info-value">
                    {user.telegram}
                  </span>
                </div>
              )}
              {user.locale && (
                <div className="profile-page__info-item">
                  <span className="profile-page__info-label">Локаль</span>
                  <span className="profile-page__info-value">
                    {user.locale}
                  </span>
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
                      <span className="profile-page__schedule-off">
                        Выходной
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>Занятость на неделе</h3>
              <button onClick={() => setWeekOffset(w => w - 1)} style={{ padding: "2px 8px", cursor: "pointer" }}>←</button>
              <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>{getWeekStart(weekOffset)}</span>
              <button onClick={() => setWeekOffset(w => w + 1)} style={{ padding: "2px 8px", cursor: "pointer" }}>→</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "44px repeat(5, 1fr)", gap: "2px", fontSize: "11px" }}>
              <div />
              {["Пн","Вт","Ср","Чт","Пт"].map(d => (
                <div key={d} style={{ textAlign: "center", fontWeight: 600, padding: "4px", color: "var(--color-text-secondary)" }}>{d}</div>
              ))}
              {Array.from({ length: 9 }, (_, i) => i + 9).map(hour => {
                const weekMon = getWeekStart(weekOffset);
                return (
                  <React.Fragment key={hour}>
                    <div style={{ textAlign: "right", padding: "4px 4px 4px 0", color: "var(--color-text-secondary)" }}>{hour}:00</div>
                    {[0,1,2,3,4].map(dayOffset => {
                      const d = new Date(weekMon);
                      d.setDate(d.getDate() + dayOffset);
                      const dateStr = d.toISOString().split("T")[0];
                      const dayData = availability.find(a => a.date === dateStr);
                      const isBusy = dayData?.busy_slots.some(s => {
                        const slotH = parseInt(s.start.split(":")[0]);
                        const endH  = parseInt(s.end.split(":")[0]);
                        return hour >= slotH && hour < endH;
                      }) ?? false;
                      return (
                        <div key={dayOffset} style={{
                          background: isBusy ? "#fee2e2" : "#dcfce7",
                          borderRadius: "3px",
                          minHeight: "20px",
                        }} />
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "8px", fontSize: "11px", color: "var(--color-text-secondary)" }}>
              <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#dcfce7", borderRadius: 2, marginRight: 4 }} />Свободен</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#fee2e2", borderRadius: 2, marginRight: 4 }} />Занят</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};
