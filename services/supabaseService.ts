
import { supabase } from './supabaseClient';
import { WorkoutSession, SessionTemplate, ScheduledSession } from '../types';

// ============ TEMPLATES ============

export const fetchTemplatesFromSupabase = async (): Promise<SessionTemplate[]> => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
  
  return data.map(row => ({
    id: row.id,
    name: row.name,
    exerciseIds: row.exercises?.exerciseIds || [],
    defaultSets: row.exercises?.defaultSets || 3,
    defaultReps: row.exercises?.defaultReps || 10
  }));
};

export const saveTemplateToSupabase = async (template: SessionTemplate): Promise<boolean> => {
  const { error } = await supabase
    .from('templates')
    .upsert({
      id: template.id,
      name: template.name,
      exercises: {
        exerciseIds: template.exerciseIds,
        defaultSets: template.defaultSets,
        defaultReps: template.defaultReps
      },
      updated_at: new Date().toISOString()
    });
  
  if (error) {
    console.error('Error saving template:', error);
    return false;
  }
  return true;
};

export const deleteTemplateFromSupabase = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting template:', error);
    return false;
  }
  return true;
};

// ============ SESSIONS ============

export const fetchSessionsFromSupabase = async (): Promise<WorkoutSession[]> => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
  
  return data.map(row => ({
    id: row.id,
    name: row.name,
    date: row.date,
    completed: row.completed,
    duration: row.duration,
    exercises: row.exercises || [],
    isHistorical: row.is_historical
  }));
};

export const saveSessionToSupabase = async (session: WorkoutSession): Promise<boolean> => {
  const { error } = await supabase
    .from('sessions')
    .upsert({
      id: session.id,
      name: session.name,
      date: session.date,
      completed: session.completed,
      duration: session.duration,
      exercises: session.exercises,
      is_historical: session.isHistorical || false,
      updated_at: new Date().toISOString()
    });
  
  if (error) {
    console.error('Error saving session:', error);
    return false;
  }
  return true;
};

// ============ SCHEDULED SESSIONS ============

export const fetchScheduledSessionsFromSupabase = async (): Promise<ScheduledSession[]> => {
  const { data, error } = await supabase
    .from('scheduled_sessions')
    .select('*')
    .order('date', { ascending: true });
  
  if (error) {
    console.error('Error fetching scheduled sessions:', error);
    return [];
  }
  
  return data.map(row => ({
    date: row.date,
    templateId: row.template_id
  }));
};

export const saveScheduledSessionToSupabase = async (scheduled: ScheduledSession): Promise<boolean> => {
  // First delete existing for that date, then insert
  await supabase
    .from('scheduled_sessions')
    .delete()
    .eq('date', scheduled.date);
  
  const { error } = await supabase
    .from('scheduled_sessions')
    .insert({
      date: scheduled.date,
      template_id: scheduled.templateId
    });
  
  if (error) {
    console.error('Error saving scheduled session:', error);
    return false;
  }
  return true;
};

export const removeScheduledSessionFromSupabase = async (date: string): Promise<boolean> => {
  const { error } = await supabase
    .from('scheduled_sessions')
    .delete()
    .eq('date', date);
  
  if (error) {
    console.error('Error removing scheduled session:', error);
    return false;
  }
  return true;
};

// ============ ACTIVE SESSION DRAFT ============

export const saveActiveSessionDraftToSupabase = async (session: WorkoutSession | null): Promise<boolean> => {
  const { error } = await supabase
    .from('active_session_draft')
    .upsert({
      id: 1,
      session_data: session,
      updated_at: new Date().toISOString()
    });
  
  if (error) {
    console.error('Error saving active session draft:', error);
    return false;
  }
  return true;
};

export const fetchActiveSessionDraftFromSupabase = async (): Promise<WorkoutSession | null> => {
  const { data, error } = await supabase
    .from('active_session_draft')
    .select('session_data')
    .eq('id', 1)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data.session_data as WorkoutSession | null;
};

// ============ SYNC UTILITIES ============

export const syncLocalToSupabase = async (
  templates: SessionTemplate[],
  sessions: WorkoutSession[],
  scheduledSessions: ScheduledSession[]
): Promise<{ success: boolean; message: string }> => {
  try {
    // Sync templates
    for (const template of templates) {
      await saveTemplateToSupabase(template);
    }
    
    // Sync sessions
    for (const session of sessions) {
      await saveSessionToSupabase(session);
    }
    
    // Sync scheduled sessions
    for (const scheduled of scheduledSessions) {
      await saveScheduledSessionToSupabase(scheduled);
    }
    
    return { success: true, message: 'All data synced to cloud successfully!' };
  } catch (err) {
    console.error('Sync error:', err);
    return { success: false, message: 'Failed to sync some data to cloud.' };
  }
};
