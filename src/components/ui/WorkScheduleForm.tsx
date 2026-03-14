import React, { useState, useEffect } from 'react';
import { Checkbox } from '../ui/Checkbox';
import { Input } from '../ui/Input';
import type { WorkScheduleDay } from '../../types';
import './WorkScheduleForm.scss';

interface WorkScheduleFormProps {
  onChange: (schedule: WorkScheduleDay[]) => void;
  onWorkingDaysChange?: (count: number) => void;
  onTotalHoursChange?: (hours: number) => void;
}

const DAYS_OF_WEEK = [
  { day: 1, label: 'Понедельник' },
  { day: 2, label: 'Вторник' },
  { day: 3, label: 'Среда' },
  { day: 4, label: 'Четверг' },
  { day: 5, label: 'Пятница' },
  { day: 6, label: 'Суббота' },
  { day: 7, label: 'Воскресенье' },
];

const DEFAULT_SCHEDULE: WorkScheduleDay[] = DAYS_OF_WEEK.map((day) => ({
  day_of_week: day.day,
  is_working_day: day.day <= 5,
  start_time: day.day <= 5 ? '09:00' : undefined,
  end_time: day.day <= 5 ? '17:00' : undefined,
}));

const calcTotalHours = (schedule: WorkScheduleDay[]): number => {
  let total = 0;
  for (const day of schedule) {
    if (!day.is_working_day || !day.start_time || !day.end_time) continue;
    const [sh, sm] = day.start_time.split(':').map(Number);
    const [eh, em] = day.end_time.split(':').map(Number);
    const start = sh + sm / 60;
    const end = eh + em / 60;
    if (end > start) {
      total += end - start;
    }
  }
  return total;
};

export const WorkScheduleForm: React.FC<WorkScheduleFormProps> = ({
  onChange,
  onWorkingDaysChange,
  onTotalHoursChange,
}) => {
  const [schedule, setSchedule] = useState<WorkScheduleDay[]>(DEFAULT_SCHEDULE);

  useEffect(() => {
    onChange(schedule);
    const workingCount = schedule.filter((d) => d.is_working_day).length;
    onWorkingDaysChange?.(workingCount);
    const total = calcTotalHours(schedule);
    onTotalHoursChange?.(total);
  }, [schedule, onChange, onWorkingDaysChange, onTotalHoursChange]);

  const handleWorkingDayChange = (dayIndex: number, isWorking: boolean) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex] = {
      ...newSchedule[dayIndex],
      is_working_day: isWorking,
      start_time: isWorking ? newSchedule[dayIndex].start_time || '09:00' : undefined,
      end_time: isWorking ? newSchedule[dayIndex].end_time || '17:00' : undefined,
    };
    setSchedule(newSchedule);
  };

  const handleTimeChange = (dayIndex: number, field: 'start_time' | 'end_time', value: string) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex] = {
      ...newSchedule[dayIndex],
      [field]: value,
    };
    setSchedule(newSchedule);
  };

  
  return (
    <div className="work-schedule">
      <div className="work-schedule__table">
        {DAYS_OF_WEEK.map((day, index) => (
          <div key={day.day} className="work-schedule__row">
            <div className="work-schedule__day">
              <Checkbox
                checked={schedule[index].is_working_day}
                onChange={(e) => handleWorkingDayChange(index, e.target.checked)}
                label={day.label}
              />
            </div>
            <div className="work-schedule__times">
              <Input
                type="time"
                value={schedule[index].start_time || ''}
                onChange={(e) => handleTimeChange(index, 'start_time', e.target.value)}
                disabled={!schedule[index].is_working_day}
                placeholder="Начало"
              />
              <Input
                type="time"
                value={schedule[index].end_time || ''}
                onChange={(e) => handleTimeChange(index, 'end_time', e.target.value)}
                disabled={!schedule[index].is_working_day}
                placeholder="Конец"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
