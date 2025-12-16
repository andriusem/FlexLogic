
import { WorkoutSession, SessionTemplate, ScheduledSession } from '../types';
import { DEFAULT_TEMPLATES } from '../constants';
import {
  fetchTemplatesFromSupabase,
  saveTemplateToSupabase,
  deleteTemplateFromSupabase,
  fetchSessionsFromSupabase,
  saveSessionToSupabase,
  fetchScheduledSessionsFromSupabase,
  saveScheduledSessionToSupabase,
  removeScheduledSessionFromSupabase,
  saveActiveSessionDraftToSupabase,
  fetchActiveSessionDraftFromSupabase,
  syncLocalToSupabase
} from './supabaseService';

const KEYS = {
  SESSIONS: 'flexlogic_sessions',
  TEMPLATES: 'flexlogic_templates',
  HISTORY: 'flexlogic_history',
  SCHEDULE: 'flexlogic_schedule',
  ACTIVE_SESSION: 'flexlogic_active_session_draft'
};

// Local-first getters (synchronous for immediate UI)
export const getTemplates = (): SessionTemplate[] => {
  const stored = localStorage.getItem(KEYS.TEMPLATES);
  if (!stored) return DEFAULT_TEMPLATES;
  return JSON.parse(stored);
};

// Async version that fetches from Supabase and updates local cache
export const getTemplatesAsync = async (): Promise<SessionTemplate[]> => {
  try {
    const cloudTemplates = await fetchTemplatesFromSupabase();
    if (cloudTemplates.length > 0) {
      localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(cloudTemplates));
      return cloudTemplates;
    }
  } catch (err) {
    console.error('Failed to fetch templates from cloud:', err);
  }
  return getTemplates();
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
  // Sync to cloud in background
  saveTemplateToSupabase(template).catch(err => console.error('Cloud sync failed:', err));
};

export const deleteTemplate = (id: string) => {
  const templates = getTemplates().filter(t => t.id !== id);
  localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(templates));
  // Sync to cloud in background
  deleteTemplateFromSupabase(id).catch(err => console.error('Cloud sync failed:', err));
};

export const getSessions = (): WorkoutSession[] => {
  const stored = localStorage.getItem(KEYS.SESSIONS);
  return stored ? JSON.parse(stored) : [];
};

// Async version that fetches from Supabase and updates local cache
export const getSessionsAsync = async (): Promise<WorkoutSession[]> => {
  try {
    const cloudSessions = await fetchSessionsFromSupabase();
    if (cloudSessions.length > 0) {
      localStorage.setItem(KEYS.SESSIONS, JSON.stringify(cloudSessions));
      return cloudSessions;
    }
  } catch (err) {
    console.error('Failed to fetch sessions from cloud:', err);
  }
  return getSessions();
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
  // Sync to cloud in background
  saveSessionToSupabase(session).catch(err => console.error('Cloud sync failed:', err));
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

// Async version that fetches from Supabase and updates local cache
export const getScheduledSessionsAsync = async (): Promise<ScheduledSession[]> => {
  try {
    const cloudSchedule = await fetchScheduledSessionsFromSupabase();
    if (cloudSchedule.length > 0) {
      localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(cloudSchedule));
      return cloudSchedule;
    }
  } catch (err) {
    console.error('Failed to fetch schedule from cloud:', err);
  }
  return getScheduledSessions();
};

export const saveScheduledSession = (scheduled: ScheduledSession) => {
  const schedule = getScheduledSessions().filter(s => s.date !== scheduled.date); // Remove existing for that date
  schedule.push(scheduled);
  localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(schedule));
  // Sync to cloud in background
  saveScheduledSessionToSupabase(scheduled).catch(err => console.error('Cloud sync failed:', err));
};

export const removeScheduledSession = (date: string) => {
  const schedule = getScheduledSessions().filter(s => s.date !== date);
  localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(schedule));
  // Sync to cloud in background
  removeScheduledSessionFromSupabase(date).catch(err => console.error('Cloud sync failed:', err));
};

// Active Session Draft Handling (Auto-Save)
export const saveActiveSessionDraft = (session: WorkoutSession | null) => {
  if (session) {
    localStorage.setItem(KEYS.ACTIVE_SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(KEYS.ACTIVE_SESSION);
  }
  // Sync to cloud in background
  saveActiveSessionDraftToSupabase(session).catch(err => console.error('Cloud sync failed:', err));
};

export const getActiveSessionDraft = (): WorkoutSession | null => {
  const stored = localStorage.getItem(KEYS.ACTIVE_SESSION);
  return stored ? JSON.parse(stored) : null;
};

// Async version that fetches from Supabase
export const getActiveSessionDraftAsync = async (): Promise<WorkoutSession | null> => {
  try {
    const cloudDraft = await fetchActiveSessionDraftFromSupabase();
    if (cloudDraft) {
      localStorage.setItem(KEYS.ACTIVE_SESSION, JSON.stringify(cloudDraft));
      return cloudDraft;
    }
  } catch (err) {
    console.error('Failed to fetch active session draft from cloud:', err);
  }
  return getActiveSessionDraft();
};

// Initial sync: Pull data from cloud on app start
export const initializeFromCloud = async (): Promise<void> => {
  console.log('Initializing data from cloud...');
  await Promise.all([
    getTemplatesAsync(),
    getSessionsAsync(),
    getScheduledSessionsAsync(),
    getActiveSessionDraftAsync()
  ]);
  console.log('Cloud sync complete.');
};

// Push all local data to cloud (useful for first-time sync)
export const pushLocalDataToCloud = async (): Promise<{ success: boolean; message: string }> => {
  const templates = getTemplates();
  const sessions = getSessions();
  const scheduledSessions = getScheduledSessions();
  return syncLocalToSupabase(templates, sessions, scheduledSessions);
};
