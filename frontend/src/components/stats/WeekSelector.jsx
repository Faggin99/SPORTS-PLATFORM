import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { WeekPickerModal } from './WeekPickerModal';

export function WeekSelector({ value, onChange, label = "Semana", selectedRange = [], rangeCount = 1 }) {
  const { colors } = useTheme();
  const [showPickerModal, setShowPickerModal] = useState(false);

  // Parse week identifier "YYYY-WW" to get week info
  function parseWeekIdentifier(identifier) {
    const [year, week] = identifier.split('-').map(Number);
    const startDate = getDateOfISOWeek(week, year);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    return {
      identifier,
      year,
      weekNumber: week,
      startDate,
      endDate,
    };
  }

  function getDateOfISOWeek(week, year) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
  }

  function getWeekFromDate(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayNum = d.getDay() || 7;
    const thursday = new Date(d);
    thursday.setDate(d.getDate() + (4 - dayNum));
    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((thursday - yearStart) / 86400000) + 1) / 7);

    return {
      identifier: `${thursday.getFullYear()}-${String(weekNo).padStart(2, '0')}`,
      year: thursday.getFullYear(),
      weekNumber: weekNo,
      startDate: (() => {
        const start = new Date(d);
        start.setDate(d.getDate() - (dayNum - 1));
        return start;
      })(),
      endDate: (() => {
        const end = new Date(d);
        end.setDate(d.getDate() + (7 - dayNum));
        return end;
      })(),
    };
  }

  const currentWeek = parseWeekIdentifier(value);

  function navigateWeek(direction) {
    const newDate = new Date(currentWeek.startDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    const newWeek = getWeekFromDate(newDate);
    onChange(newWeek.identifier);
  }

  function goToToday() {
    const today = getWeekFromDate(new Date());
    onChange(today.identifier);
  }

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.375rem',
  };

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.25rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '0.25rem',
    color: colors.text,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const weekInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: colors.text,
    fontWeight: '500',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const todayButtonStyle = {
    padding: '0.25rem 0.5rem',
    backgroundColor: colors.primary + '20',
    border: 'none',
    borderRadius: '0.25rem',
    color: colors.primary,
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  };

  return (
    <>
      <div style={containerStyle}>
        <span style={{ fontSize: '0.75rem', color: colors.textSecondary, fontWeight: '500' }}>
          {label}:
        </span>

        <button
          style={buttonStyle}
          onClick={() => navigateWeek(-1)}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceHover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Semana anterior"
        >
          <ChevronLeft size={18} />
        </button>

        <div
          style={weekInfoStyle}
          onClick={() => setShowPickerModal(true)}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceHover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Clique para escolher uma semana"
        >
          <Calendar size={16} />
          <span>
            Semana {currentWeek.weekNumber}/{currentWeek.year}
          </span>
          <span style={{ color: colors.textSecondary, fontSize: '0.75rem' }}>
            ({currentWeek.startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {currentWeek.endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})
          </span>
        </div>

        <button
          style={buttonStyle}
          onClick={() => navigateWeek(1)}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceHover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Próxima semana"
        >
          <ChevronRight size={18} />
        </button>

        <button
          style={todayButtonStyle}
          onClick={goToToday}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primary + '40'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary + '20'}
        >
          Hoje
        </button>
      </div>

      <WeekPickerModal
        isOpen={showPickerModal}
        onClose={() => setShowPickerModal(false)}
        currentWeek={value}
        onSelectWeek={onChange}
        selectedRange={selectedRange}
        rangeCount={rangeCount}
      />
    </>
  );
}
