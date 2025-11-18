import React, { useState } from 'react';
import WeekCalendar from '../components/calendar/WeekCalendar';
import { useMicrocycle } from '../hooks/useMicrocycle';

export default function CalendarPage() {
  const [weekIdentifier, setWeekIdentifier] = useState('2025-44'); // Current week
  const { microcycle, loading, error } = useMicrocycle(weekIdentifier);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div className="calendar-page">
      <h1>Calendário de Treinos</h1>
      <WeekCalendar microcycle={microcycle} onBlockClick={(block) => console.log(block)} />
    </div>
  );
}
