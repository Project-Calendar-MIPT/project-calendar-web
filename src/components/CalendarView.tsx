import { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ru } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

import type { CalendarEvent, Task } from "../types";

const customRuLocale = {
  ...ru,
  localize: {
    ...ru.localize,
    day: (day: number, options?: any) => {
      const days = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
      if (options?.width === "abbreviated") {
        return days[day];
      }
      return days[day] || "";
    },
  },
};

const locales = { ru: customRuLocale };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const priorityColors: Record<string, string> = {
  low: "#82c7a5",
  medium: "#6fa8dc",
  high: "#f6b26b",
  critical: "#e06666",
};

const weekDays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const monthNames = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
const monthNamesCapital = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

interface CalendarViewProps {
  events: CalendarEvent[];
  onSelectEvent?: (e: CalendarEvent) => void;
  onRangeChange?: (range: any) => void;
}

export const CalendarView = ({ events, onSelectEvent }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<"month" | "week" | "day">(
    "month",
  );

  const eventStyleGetter = (event: CalendarEvent) => {
    const task: Task | undefined = event.resource;
    const bg =
      task?.priority && priorityColors[task.priority]
        ? priorityColors[task.priority]
        : priorityColors.medium;

    return {
      style: {
        backgroundColor: bg,
        color: "white",
        borderRadius: "6px",
        padding: "4px 6px",
        border: "none",
        fontSize: "14px",
      },
    };
  };

  const handleViewChange = (view: "month" | "week" | "day") => {
    setCurrentView(view);
  };

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  return (
    <div style={{ height: "80vh", width: "100%" }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        date={currentDate}
        view={currentView}
        onView={handleViewChange}
        onNavigate={handleNavigate}
        onSelectEvent={onSelectEvent}
        eventPropGetter={eventStyleGetter}
        views={["month", "week", "day"]}
        culture="ru"
        popup
        formats={{
          weekdayFormat: (date: Date) => {
            return weekDays[date.getDay()];
          },

          monthHeaderFormat: (date: Date) => {
            return `${monthNamesCapital[date.getMonth()]} ${date.getFullYear()}`;
          },

          dayHeaderFormat: (date: Date) => {
            return `${date.getDate()} ${monthNames[date.getMonth()]}`;
          },

          dayRangeHeaderFormat: ({
            start,
            end,
          }: {
            start: Date;
            end: Date;
          }) => {
            if (start.getMonth() === end.getMonth()) {
              return `${start.getDate()}–${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
            }
            return `${start.getDate()} ${monthNames[start.getMonth()]}–${end.getDate()} ${monthNames[end.getMonth()]} ${start.getFullYear()}`;
          },
        }}
        messages={{
          next: "→",
          previous: "←",
          today: "Сегодня",
          month: "Месяц",
          week: "Неделя",
          day: "День",
          showMore: (count: number) => `+${count} ещё`,
        }}
      />
    </div>
  );
};
