import React from 'react';
import DayColumn from './DayColumn';

export default function WeekCalendar({ microcycle, onBlockClick }) {
  if (!microcycle?.sessions) return <div>Carregando...</div>;

  return (
    <div className="week-calendar">
      <div className="calendar-grid">
        {microcycle.sessions.map((session) => (
          <DayColumn
            key={session.id}
            session={session}
            onBlockClick={onBlockClick}
          />
        ))}
      </div>
    </div>
  );
}
