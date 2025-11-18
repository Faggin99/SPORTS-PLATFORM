// Page exports
export { default as CalendarPage } from './pages/CalendarPage';
export { default as PlantelPage } from './pages/PlantelPage';

// Service exports
export * from './services/microcycleService';
export * from './services/sessionService';
export * from './services/activityService';
export * from './services/athleteService';
export * from './services/fileService';

// Hook exports
export * from './hooks/useMicrocycle';
export * from './hooks/useSession';
export * from './hooks/useAthletes';
export * from './hooks/useFileUpload';

// Component exports
export { default as WeekCalendar } from './components/calendar/WeekCalendar';
export { default as DayColumn } from './components/calendar/DayColumn';
export { default as BlockCard } from './components/calendar/BlockCard';
export { default as TrainingModal } from './components/modals/TrainingModal';
export { default as ActivityForm } from './components/modals/ActivityForm';
export { default as FileUploader } from './components/modals/FileUploader';
export { default as GroupColumn } from './components/plantel/GroupColumn';
export { default as AthleteCard } from './components/plantel/AthleteCard';
