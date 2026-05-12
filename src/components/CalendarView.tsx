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
  normal: "#6fa8dc",
  medium: "#6fa8dc",
  high: "#f6b26b",
  urgent: "#e06666",
  critical: "#e06666",
};

const weekDays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const monthNames = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
const monthNamesCapital = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

interface CalendarViewProps {
  events: CalendarEvent[];
  backgroundEvents?: CalendarEvent[];
  onSelectEvent?: (e: CalendarEvent) => void;
  onRangeChange?: (range: any) => void;
}

export const CalendarView = ({
  events,
  backgroundEvents = [],
  onSelectEvent,
  onRangeChange,
}: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<"month" | "week" | "day">("month");

  const eventStyleGetter = (event: CalendarEvent) => {
    if (event.isMeeting) {
      return {
        style: {
          backgroundColor: "#7c3aed",
          color: "white",
          borderRadius: "6px",
          padding: "2px 6px",
          border: "none",
          fontSize: "13px",
          fontWeight: 500,
        },
      };
    }

    if (event.isDeadline) {
      const task: Task | undefined = event.resource;
      const isOverdue = task?.end_date && new Date(task.end_date) < new Date();
      return {
        style: {
          backgroundColor: isOverdue ? "#b91c1c" : "#9333ea",
          color: "white",
          borderRadius: "6px",
          padding: "2px 6px",
          border: "none",
          fontSize: "12px",
          fontWeight: 600,
          opacity: 0.92,
        },
      };
    }

    const task: Task | undefined = event.resource;
    const priority = task?.priority ?? "normal";
    const bg = priorityColors[priority] ?? priorityColors.normal;

    return {
      style: {
        backgroundColor: bg,
        color: "white",
        borderRadius: "6px",
        padding: "2px 6px",
        border: "none",
        fontSize: "13px",
      },
    };
  };

  const backgroundEventPropGetter = (_event: CalendarEvent) => ({
    style: {
      backgroundColor: "#fde68a",
      opacity: 0.35,
      borderRadius: "4px",
      border: "none",
    },
  });

  return (
    <div style={{ height: "80vh", width: "100%" }}>
      <Calendar
        localizer={localizer}
        events={events}
        backgroundEvents={backgroundEvents}
        startAccessor="start"
        endAccessor="end"
        allDayAccessor="allDay"
        style={{ height: "100%" }}
        date={currentDate}
        view={currentView}
        onView={(v: any) => setCurrentView(v)}
        onNavigate={(d: Date) => setCurrentDate(d)}
        onSelectEvent={onSelectEvent}
        onRangeChange={onRangeChange}
        eventPropGetter={eventStyleGetter}
        backgroundEventPropGetter={backgroundEventPropGetter}
        views={["month", "week", "day"]}
        culture="ru"
        popup
        step={30}
        timeslots={2}
        scrollToTime={new Date(1970, 1, 1, 8, 0)}
        formats={{
          weekdayFormat: (date: Date) => weekDays[date.getDay()],
          monthHeaderFormat: (date: Date) =>
            `${monthNamesCapital[date.getMonth()]} ${date.getFullYear()}`,
          dayHeaderFormat: (date: Date) =>
            `${date.getDate()} ${monthNames[date.getMonth()]}`,
          dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) => {
            if (start.getMonth() === end.getMonth()) {
              return `${start.getDate()}–${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
            }
            return `${start.getDate()} ${monthNames[start.getMonth()]}–${end.getDate()} ${monthNames[end.getMonth()]} ${start.getFullYear()}`;
          },
          timeGutterFormat: (date: Date) =>
            format(date, "HH:mm"),
          eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
            `${format(start, "HH:mm")}–${format(end, "HH:mm")}`,
        }}
        messages={{
          next: "→",
          previous: "←",
          today: "Сегодня",
          month: "Месяц",
          week: "Неделя",
          day: "День",
          showMore: (count: number) => `+${count} ещё`,
          allDay: "Весь день",
          noEventsInRange: "Нет событий",
        }}
      />
    </div>
  );
};
