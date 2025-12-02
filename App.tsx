
import React, { useState, useEffect, useRef } from 'react';
import { Dumbbell, Calendar, BarChart2, Plus, Settings, Clock, ChevronRight, Layout, X } from 'lucide-react';
import { WorkoutSession, SessionTemplate, ExerciseSessionLog, SetLog } from './types';
import { getTemplates, getSessions, saveSession, getLastLogForExercise, deleteTemplate } from './services/storageService';
import { EXERCISES, FATIGUE_FACTOR, WEIGHT_INCREMENT, DEFAULT_TEMPLATES } from './constants';
import { SessionCard } from './components/SessionCard';
import { ExerciseCard } from './components/ExerciseCard';
import { SessionPlanner } from './components/SessionPlanner';
import { ScheduleView } from './components/ScheduleView';
import { ProgressView } from './components/ProgressView';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'planner' | 'active' | 'schedule' | 'progress'>('home');
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<SessionTemplate | null>(null);
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  
  // Timer State
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    refreshData();
  }, [view]);

  // Timer Effect
  useEffect(() => {
    if (view === 'active') {
        const startTime = Date.now() - (timer * 1000); // Handle re-renders keeping relative time
        timerRef.current = window.setInterval(() => {
            setTimer(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
    } else {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const refreshData = () => {
    setTemplates(getTemplates());
    setSessions(getSessions());
  };

  /**
   * RECALCULATE WEIGHTS BASED ON FATIGUE
   * 
   * This function iterates through the session exercises.
   * It groups them by Muscle Group.
   * It applies a fatigue factor to the 'baseWeight' if the exercise is not first for that muscle.
   */
  const recalculateSessionWeights = (exercises: ExerciseSessionLog[]): ExerciseSessionLog[] => {
    // 1. Sort by current order
    const sorted = [...exercises].sort((a, b) => a.order - b.order);

    // 2. Track usage counts per muscle group
    const muscleCounts: Record<string, number> = {};

    return sorted.map(log => {
      const def = EXERCISES[log.exerciseId];
      if (!def) return log;

      const muscle = def.muscleGroup;
      const count = muscleCounts[muscle] || 0;
      muscleCounts[muscle] = count + 1;

      // 3. Calculate Fatigue
      // If it's the 1st exercise for this muscle, 100% base weight.
      // If 2nd, 95%. If 3rd, 90%. (Assuming FATIGUE_FACTOR is 0.05)
      // We round down to nearest 2.5kg increment.
      const fatigueMultiplier = 1 - (count * FATIGUE_FACTOR);
      
      // Ensure we don't go below 50% or 0
      const safeMultiplier = Math.max(0.5, fatigueMultiplier);
      
      // Safety check for baseWeight to prevent NaN
      const currentBaseWeight = log.baseWeight || 0;

      const adjustedWeight = Math.floor((currentBaseWeight * safeMultiplier) / WEIGHT_INCREMENT) * WEIGHT_INCREMENT;

      // Update sets to match adjusted weight, ONLY if they haven't been completed yet
      // This prevents changing weight on sets the user already finished
      const newSets = log.sets.map(s => {
        if (s.completed) return s; // Don't change completed sets
        return { ...s, weight: adjustedWeight };
      });

      return {
        ...log,
        sets: newSets
      };
    });
  };

  const startSession = (template: SessionTemplate) => {
    const rawExercises: ExerciseSessionLog[] = template.exerciseIds.map((exId, idx) => {
      // 1. Get History
      const lastLog = getLastLogForExercise(exId);
      
      // 2. Determine Base Weight (Fresh Strength)
      // If user successfully did 4x12 last time, we increase the BASE weight.
      let baseWeight = lastLog ? (lastLog.baseWeight || lastLog.weight) : 20; // Default 20kg
      
      if (lastLog && lastLog.success) {
        baseWeight += WEIGHT_INCREMENT; 
      }

      return {
        exerciseId: exId,
        targetSets: template.defaultSets,
        targetReps: template.defaultReps,
        order: idx,
        baseWeight: baseWeight,
        sets: Array(template.defaultSets).fill(null).map(() => ({
          repsCompleted: 0,
          weight: baseWeight, // Will be adjusted by recalculateSessionWeights immediately
          completed: false
        }))
      };
    });

    const adjustedExercises = recalculateSessionWeights(rawExercises);

    const newSession: WorkoutSession = {
      id: `ses-${Date.now()}`,
      name: template.name,
      date: new Date().toISOString(),
      completed: false,
      duration: 0,
      exercises: adjustedExercises
    };
    setActiveSession(newSession);
    setTimer(0);
    setView('active');
  };

  const updateActiveLog = (updatedLog: ExerciseSessionLog) => {
    if (!activeSession) return;
    const newExercises = [...activeSession.exercises];
    const idx = newExercises.findIndex(e => e.order === updatedLog.order);
    
    if (idx >= 0) {
      // Check if weight changed manually.
      // We update baseWeight to the user's latest 'intent'.
      // The most accurate representation of what the user can lift "Fresh" (or at least their new standard)
      // is the weight they ended the exercise with.
      const lastSetWeight = updatedLog.sets[updatedLog.sets.length - 1].weight;
      updatedLog.baseWeight = lastSetWeight;
      
      newExercises[idx] = updatedLog;
    }
    
    // We do NOT call recalculateSessionWeights here usually, unless we want to dynamically 
    // change later exercises based on this change. For simplicity, let's just update the log.
    setActiveSession({ ...activeSession, exercises: newExercises });
  };

  const handleSwapExercise = (currentIndex: number, newExerciseId: string) => {
    if (!activeSession) return;
    let newExercises = [...activeSession.exercises];
    const exerciseToSwap = newExercises.find(e => e.order === currentIndex);
    
    if (exerciseToSwap) {
       const lastLog = getLastLogForExercise(newExerciseId);
       // Inherit target sets/reps, but get fresh weight
       const baseWeight = lastLog ? (lastLog.baseWeight || lastLog.weight) : 20;

       exerciseToSwap.exerciseId = newExerciseId;
       exerciseToSwap.baseWeight = baseWeight;
       exerciseToSwap.sets = exerciseToSwap.sets.map(s => ({...s, weight: baseWeight, repsCompleted: 0, completed: false}));
    }

    // Apply fatigue logic again because muscle groups might have changed
    newExercises = recalculateSessionWeights(newExercises);
    setActiveSession({ ...activeSession, exercises: newExercises });
  };

  const handleReorderSwap = (fromIndex: number, toIndex: number) => {
    if (!activeSession) return;
    let newExercises = [...activeSession.exercises];
    
    const exA = newExercises.find(e => e.order === fromIndex);
    const exB = newExercises.find(e => e.order === toIndex);

    if (exA && exB) {
      exA.order = toIndex;
      exB.order = fromIndex;
      
      // Recalculate everything based on new order
      newExercises = recalculateSessionWeights(newExercises);
      
      // Sort immediately
      newExercises.sort((a, b) => a.order - b.order);
      setActiveSession({ ...activeSession, exercises: newExercises });
    }
  };

  const finishSession = () => {
    if (activeSession) {
      saveSession({ ...activeSession, completed: true, duration: timer });
      setActiveSession(null);
      setTimer(0);
      setView('home');
    }
  };

  const handleEditTemplate = (tpl: SessionTemplate) => {
    setEditingTemplate(tpl);
    setView('planner');
  };

  const handleDeleteTemplate = (id: string) => {
    // Optimistic update for instant feedback
    setTemplates(prev => prev.filter(t => t.id !== id));
    deleteTemplate(id);
  };

  const handleCreateNewClick = () => {
    setIsTemplateSelectorOpen(true);
  };

  const handleCreateFromTemplate = (template: SessionTemplate | null) => {
    if (template) {
        // Clone the template with a new ID so it saves as a new routine
        const newTemplate = {
            ...template,
            id: `tpl-${Date.now()}`
        };
        setEditingTemplate(newTemplate);
    } else {
        // Empty template
        setEditingTemplate(null);
    }
    setIsTemplateSelectorOpen(false);
    setView('planner');
  };

  // Render Navbar Helper
  const renderNavbar = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-gym-900/95 backdrop-blur border-t border-gym-700 p-2 pb-6 flex justify-around z-50 shadow-[0_-5px_20px_rgba(247,230,202,0.3)]">
        <button 
          onClick={() => setView('home')} 
          className="flex flex-col items-center justify-center w-16 group"
        >
          <div className={`p-1.5 rounded-lg border-2 transition-all duration-200 mb-1 ${
            view === 'home' 
              ? 'border-gym-accent text-white bg-gym-accent shadow-lg shadow-orange-500/20' 
              : 'border-transparent text-gym-muted group-hover:text-gym-accent'
          }`}>
             <Dumbbell size={20} strokeWidth={2.5} />
          </div>
          <span className={`text-[10px] font-bold ${view === 'home' ? 'text-gym-accent' : 'text-gym-muted'}`}>Gym</span>
        </button>

        <button 
          onClick={() => setView('schedule')}
          className="flex flex-col items-center justify-center w-16 group"
        >
           <div className={`p-1.5 rounded-lg border-2 transition-all duration-200 mb-1 ${
            view === 'schedule' 
              ? 'border-gym-accent text-white bg-gym-accent shadow-lg shadow-orange-500/20' 
              : 'border-transparent text-gym-muted group-hover:text-gym-accent'
           }`}>
             <Calendar size={20} strokeWidth={2.5} />
           </div>
          <span className={`text-[10px] font-bold ${view === 'schedule' ? 'text-gym-accent' : 'text-gym-muted'}`}>Schedule</span>
        </button>

        <button 
          onClick={() => setView('progress')}
          className="flex flex-col items-center justify-center w-16 group"
        >
          <div className={`p-1.5 rounded-lg border-2 transition-all duration-200 mb-1 ${
            view === 'progress' 
              ? 'border-gym-accent text-white bg-gym-accent shadow-lg shadow-orange-500/20' 
              : 'border-transparent text-gym-muted group-hover:text-gym-accent'
          }`}>
             <BarChart2 size={20} strokeWidth={2.5} />
          </div>
          <span className={`text-[10px] font-bold ${view === 'progress' ? 'text-gym-accent' : 'text-gym-muted'}`}>Progress</span>
        </button>
      </nav>
  );

  // Views
  if (view === 'planner') {
    return (
        <SessionPlanner 
            onClose={() => {
                setView('home');
                setEditingTemplate(null);
            }} 
            initialTemplate={editingTemplate}
        />
    );
  }

  if (view === 'schedule') {
    return (
      <div className="relative">
         <ScheduleView />
         {renderNavbar()}
      </div>
    );
  }

  if (view === 'progress') {
    return (
      <div className="relative">
        <ProgressView />
        {renderNavbar()}
      </div>
    );
  }

  if (view === 'active' && activeSession) {
    const exercisesSorted = [...activeSession.exercises].sort((a, b) => a.order - b.order);
    
    return (
      <div className="min-h-screen bg-gym-900 pb-20">
        <header className="sticky top-0 bg-gym-900/90 backdrop-blur-md z-10 px-4 py-3 border-b border-gym-700 relative flex justify-center items-center shadow-sm h-16">
          
          {/* Absolute Left */}
          <div className="absolute left-4 max-w-[30%]">
            <h1 className="text-gym-text font-bold text-lg truncate leading-tight">{activeSession.name}</h1>
          </div>

          {/* Center Timer */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gym-800 border border-gym-700 shadow-inner min-w-[100px] justify-center">
            <Clock size={16} className="text-gym-accent animate-pulse" />
            <span className="text-gym-text font-mono text-lg font-bold tracking-widest">{formatTime(timer)}</span>
          </div>

          {/* Absolute Right */}
          <div className="absolute right-4">
            <button onClick={finishSession} className="bg-gym-success text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all active:scale-95">
              Finish
            </button>
          </div>
        </header>
        
        <div className="p-4 space-y-4">
          {exercisesSorted.map((log) => (
            <ExerciseCard
              key={`${log.exerciseId}-${log.order}`}
              index={log.order}
              log={log}
              totalExercises={exercisesSorted.length}
              availableExercises={exercisesSorted}
              onUpdateLog={updateActiveLog}
              onSwapExercise={handleSwapExercise}
              onReorderSwap={handleReorderSwap}
            />
          ))}
          
          <div className="text-center p-4">
             <button className="text-gym-muted text-sm flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-gym-700 rounded-xl hover:border-gym-accent hover:text-gym-accent bg-gym-800/50">
               <Plus size={18} /> Add Exercise to Session
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gym-900 text-gym-text pb-24">
      <div className="p-6 pt-10">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gym-secondary">FlexLogic</h1>
            <p className="text-gym-muted">Welcome back, Athlete.</p>
          </div>
          <button className="p-2 bg-gym-800 rounded-full text-gym-muted hover:text-gym-accent border border-gym-700">
            <Settings size={20} />
          </button>
        </header>

        {/* Weekly Calendar Mini-View */}
        <section className="mb-8">
           <div className="flex justify-between items-end mb-4">
              <h2 className="font-bold text-lg text-gym-text">This Week</h2>
              <span className="text-xs text-gym-muted">Last 7 Days</span>
           </div>
           <div className="grid grid-cols-7 gap-1">
             {Array.from({length: 7}).map((_, i) => {
               const day = new Date();
               day.setDate(day.getDate() - (6 - i));
               const isToday = i === 6;
               const hasSession = sessions.some(s => s.date.startsWith(day.toISOString().split('T')[0]));
               
               return (
                 <div key={i} className={`h-16 rounded-lg flex flex-col items-center justify-center border transition-colors ${isToday ? 'border-gym-accent bg-gym-800 shadow-md' : 'border-transparent bg-gym-800/50'}`}>
                   <span className="text-[10px] uppercase text-gym-muted font-bold">{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                   <span className={`font-bold text-sm ${hasSession ? 'text-gym-success' : 'text-gym-text'}`}>{day.getDate()}</span>
                   {hasSession && <div className="w-1 h-1 rounded-full bg-gym-success mt-1"></div>}
                 </div>
               );
             })}
           </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-gym-text">Start Workout</h2>
            <button 
                onClick={handleCreateNewClick} 
                className="text-white text-sm font-bold flex items-center gap-1 bg-gym-accent px-3 py-1 rounded-full hover:bg-gym-secondary transition-all shadow-md shadow-orange-500/20"
            >
              <Plus size={16} /> New Routine
            </button>
          </div>
          
          <div className="space-y-3">
            {templates.length === 0 ? (
               <div className="p-8 bg-gym-800 rounded-xl text-center border border-dashed border-gym-700">
                 <p className="text-gym-muted mb-4">No routines created yet.</p>
                 <button onClick={handleCreateNewClick} className="bg-gym-accent text-white px-6 py-2 rounded-lg font-bold">Create First Routine</button>
               </div>
            ) : (
              templates.map(tpl => (
                <SessionCard
                  key={tpl.id}
                  title={tpl.name}
                  subtitle={`${tpl.exerciseIds.length} Exercises • ~${tpl.exerciseIds.length * 5} min`}
                  onStart={() => startSession(tpl)}
                  onEdit={() => handleEditTemplate(tpl)}
                  onDelete={() => handleDeleteTemplate(tpl.id)}
                  isTemplate
                />
              ))
            )}
          </div>
        </section>

        {sessions.length > 0 && (
          <section className="mt-8">
            <h2 className="font-bold text-lg mb-4 text-gym-text">Recent Activity</h2>
            <div className="space-y-3">
              {sessions.slice().reverse().slice(0, 3).map(s => (
                <div key={s.id} className="bg-gym-800 p-4 rounded-xl border border-gym-700 flex justify-between items-center shadow-sm">
                   <div>
                     <h4 className="font-bold text-gym-text">{s.name}</h4>
                     <p className="text-xs text-gym-muted">{new Date(s.date).toLocaleDateString()}</p>
                   </div>
                   <div className="text-right">
                      <div className="text-gym-success font-bold text-sm">Completed</div>
                      <div className="text-xs text-gym-muted">{s.duration ? formatTime(s.duration) : '~'}</div>
                   </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Routine Selector Modal */}
      {isTemplateSelectorOpen && (
        <div className="fixed inset-0 bg-gym-900/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
            <div className="bg-gym-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border-t sm:border border-gym-700 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                <div className="p-4 border-b border-gym-700 flex justify-between items-center bg-gym-800">
                    <h3 className="font-bold text-gym-text text-lg">Choose a Starting Point</h3>
                    <button onClick={() => setIsTemplateSelectorOpen(false)} className="p-2 bg-gym-700 rounded-full text-gym-text hover:bg-gym-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                    <p className="text-sm text-gym-muted mb-2">Select a predefined routine to start with, or build one from scratch.</p>
                    
                    {DEFAULT_TEMPLATES.map(tpl => (
                        <button
                            key={tpl.id}
                            onClick={() => handleCreateFromTemplate(tpl)}
                            className="w-full text-left p-4 bg-white/50 border border-gym-700 rounded-xl hover:border-gym-accent hover:bg-white/80 active:scale-[0.99] transition-all group"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-gym-text group-hover:text-gym-accent transition-colors">{tpl.name}</h4>
                                    <p className="text-xs text-gym-muted">{tpl.exerciseIds.length} Exercises (Standard)</p>
                                </div>
                                <div className="bg-gym-accent/10 p-2 rounded-full text-gym-accent">
                                    <Layout size={20} />
                                </div>
                            </div>
                        </button>
                    ))}

                    <div className="h-px bg-gym-700/50 my-2"></div>

                    <button
                        onClick={() => handleCreateFromTemplate(null)}
                        className="w-full text-left p-4 bg-gym-700/20 border-2 border-dashed border-gym-700 rounded-xl hover:border-gym-accent hover:text-gym-accent active:scale-[0.99] transition-all flex justify-between items-center"
                    >
                         <span className="font-bold text-gym-text">Start from Scratch</span>
                         <Plus size={20} />
                    </button>
                </div>
            </div>
        </div>
      )}

      {renderNavbar()}
    </div>
  );
};

export default App;
