
import { WorkoutSession, SessionTemplate, ScheduledSession } from '../types';
import { DEFAULT_TEMPLATES } from '../constants';

const KEYS = {
  SESSIONS: 'flexlogic_sessions',
  TEMPLATES: 'flexlogic_templates',
  HISTORY: 'flexlogic_history',
  SCHEDULE: 'flexlogic_schedule'
};

export const getTemplates = (): SessionTemplate[] => {
  const stored = localStorage.getItem(KEYS.TEMPLATES);
  if (!stored) return DEFAULT_TEMPLATES;
  return JSON.parse(stored);
};

export const saveTemplate = (template: SessionTemplate) => {
  const templates = getTemplates();
  const existingIndex = templates.findIndex(t => t.id === template.id);
  if (existingIndex >= 0) {
    templates[existingIndex] = template;
  } else {
    templates.push(template);
  }
  localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(templates));
};

export const getSessions = (): WorkoutSession[] => {
  const stored = localStorage.getItem(KEYS.SESSIONS);
  return stored ? JSON.parse(stored) : [];
};

export const saveSession = (session: WorkoutSession) => {
  const sessions = getSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.push(session);
  }
  localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
};

export const getLastSessionForTemplate = (templateId: string): WorkoutSession | null => {
  const sessions = getSessions();
  const completed = sessions.filter(s => s.completed).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return completed[0] || null; 
};

// Helper to find last weight used for specific exercise
// Returns the baseWeight if available, or the last used weight
export const getLastLogForExercise = (exerciseId: string): { weight: number, success: boolean, baseWeight?: number } | null => {
  const sessions = getSessions().filter(s => s.completed).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  for (const session of sessions) {
    const exLog = session.exercises.find(e => e.exerciseId === exerciseId);
    if (exLog) {
      const allRepsMet = exLog.sets.every(s => s.repsCompleted >= exLog.targetReps);
      // Use stored baseWeight if available, otherwise fallback to last set weight
      const weightToCheck = exLog.baseWeight || exLog.sets[exLog.sets.length - 1]?.weight || 0;
      
      return { 
        weight: exLog.sets[exLog.sets.length - 1]?.weight || 0, // Actual weight used
        baseWeight: weightToCheck, // The theoretical strength
        success: allRepsMet 
      };
    }
  }
  return null;
};

// Schedule Functions
export const getScheduledSessions = (): ScheduledSession[] => {
  const stored = localStorage.getItem(KEYS.SCHEDULE);
  return stored ? JSON.parse(stored) : [];
};

export const saveScheduledSession = (scheduled: ScheduledSession) => {
  const schedule = getScheduledSessions().filter(s => s.date !== scheduled.date); // Remove existing for that date
  schedule.push(scheduled);
  localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(schedule));
};

export const removeScheduledSession = (date: string) => {
  const schedule = getScheduledSessions().filter(s => s.date !== date);
  localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(schedule));
};