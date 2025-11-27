import React, { useState, useEffect } from 'react';
import { Dumbbell, Calendar, BarChart2, Plus, Home, Settings } from 'lucide-react';
import { WorkoutSession, SessionTemplate, ExerciseSessionLog, SetLog } from './types';
import { getTemplates, getSessions, saveSession, getLastLogForExercise } from './services/storageService';
import { EXERCISES, FATIGUE_FACTOR, WEIGHT_INCREMENT } from './constants';
import { SessionCard } from './components/SessionCard';
import { ExerciseCard } from './components/ExerciseCard';
import { SessionPlanner } from './components/SessionPlanner';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'planner' | 'active'>('home');
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  useEffect(() => {
    refreshData();
  }, [view]);

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

      const adjustedWeight = Math.floor((log.baseWeight * safeMultiplier) / WEIGHT_INCREMENT) * WEIGHT_INCREMENT;

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
      exercises: adjustedExercises
    };
    setActiveSession(newSession);
    setView('active');
  };

  const updateActiveLog = (updatedLog: ExerciseSessionLog) => {
    if (!activeSession) return;
    const newExercises = [...activeSession.exercises];
    const idx = newExercises.findIndex(e => e.order === updatedLog.order);
    
    // If user manually changes weight in the UI, we should update the baseWeight 
    // so the logic persists. 
    // Heuristic: If user updates set 1 weight, update baseWeight.
    if (idx >= 0) {
      // Check if weight changed manually
      const oldWeight = newExercises[idx].sets[0].weight;
      const newWeight = updatedLog.sets[0].weight;
      
      if (oldWeight !== newWeight) {
        // Reverse engineer base weight: newBase = newWeight / fatigueMultiplier
        // Or simpler: Just set baseWeight to newWeight (assuming user knows best what they can lift NOW)
        // and let future fatigue calcs use this new baseline.
        updatedLog.baseWeight = newWeight; 
      }
      
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
      saveSession({ ...activeSession, completed: true });
      setActiveSession(null);
      setView('home');
    }
  };

  // Views
  if (view === 'planner') {
    return <SessionPlanner onClose={() => setView('home')} />;
  }

  if (view === 'active' && activeSession) {
    const exercisesSorted = [...activeSession.exercises].sort((a, b) => a.order - b.order);
    
    return (
      <div className="min-h-screen bg-gym-900 pb-20">
        <header className="sticky top-0 bg-gym-900/90 backdrop-blur-md z-10 p-4 border-b border-gym-700 flex justify-between items-center shadow-lg">
          <div>
            <h1 className="text-white font-bold text-lg">{activeSession.name}</h1>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-gym-success animate-pulse"></span>
               <p className="text-gym-accent text-xs font-bold tracking-wider">LIVE GYM SESSION</p>
            </div>
          </div>
          <button onClick={finishSession} className="bg-gym-success text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-green-900/50 hover:bg-green-600 transition-all active:scale-95">
            Finish Workout
          </button>
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
             <button className="text-gray-500 text-sm flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-gym-700 rounded-xl hover:border-gym-500 hover:text-gray-300">
               <Plus size={18} /> Add Exercise to Session
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gym-900 text-white pb-24">
      <div className="p-6 pt-10">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-gym-accent">FlexLogic</h1>
            <p className="text-gray-400">Welcome back, Athlete.</p>
          </div>
          <button className="p-2 bg-gym-800 rounded-full text-gray-400 hover:text-white">
            <Settings size={20} />
          </button>
        </header>

        {/* Weekly Calendar Mini-View */}
        <section className="mb-8">
           <div className="flex justify-between items-end mb-4">
              <h2 className="font-bold text-lg">This Week</h2>
              <span className="text-xs text-gray-500">Last 7 Days</span>
           </div>
           <div className="grid grid-cols-7 gap-1">
             {Array.from({length: 7}).map((_, i) => {
               const day = new Date();
               day.setDate(day.getDate() - (6 - i));
               const isToday = i === 6;
               const hasSession = sessions.some(s => s.date.startsWith(day.toISOString().split('T')[0]));
               
               return (
                 <div key={i} className={`h-16 rounded-lg flex flex-col items-center justify-center border transition-colors ${isToday ? 'border-gym-accent bg-gym-800' : 'border-transparent bg-gym-800/50'}`}>
                   <span className="text-[10px] uppercase text-gray-500 font-bold">{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                   <span className={`font-bold text-sm ${hasSession ? 'text-gym-success' : 'text-white'}`}>{day.getDate()}</span>
                   {hasSession && <div className="w-1 h-1 rounded-full bg-gym-success mt-1"></div>}
                 </div>
               );
             })}
           </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">Start Workout</h2>
            <button onClick={() => setView('planner')} className="text-gym-accent text-sm font-bold flex items-center gap-1 bg-gym-accent/10 px-3 py-1 rounded-full hover:bg-gym-accent/20">
              <Plus size={16} /> New Routine
            </button>
          </div>
          
          <div className="space-y-3">
            {templates.length === 0 ? (
               <div className="p-8 bg-gym-800 rounded-xl text-center border border-dashed border-gym-700">
                 <p className="text-gray-400 mb-4">No routines created yet.</p>
                 <button onClick={() => setView('planner')} className="bg-gym-accent text-white px-6 py-2 rounded-lg font-bold">Create First Routine</button>
               </div>
            ) : (
              templates.map(tpl => (
                <SessionCard
                  key={tpl.id}
                  title={tpl.name}
                  subtitle={`${tpl.exerciseIds.length} Exercises • ~${tpl.exerciseIds.length * 5} min`}
                  onStart={() => startSession(tpl)}
                  isTemplate
                />
              ))
            )}
          </div>
        </section>

        {sessions.length > 0 && (
          <section className="mt-8">
            <h2 className="font-bold text-lg mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {sessions.slice().reverse().slice(0, 3).map(s => (
                <div key={s.id} className="bg-gym-800/50 p-4 rounded-xl border border-gym-800 flex justify-between items-center">
                   <div>
                     <h4 className="font-bold text-white">{s.name}</h4>
                     <p className="text-xs text-gray-500">{new Date(s.date).toLocaleDateString()}</p>
                   </div>
                   <div className="text-right">
                      <div className="text-gym-success font-bold text-sm">Completed</div>
                      <div className="text-xs text-gray-500">{s.exercises.length} Exercises</div>
                   </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gym-900/95 backdrop-blur border-t border-gym-800 p-4 pb-6 flex justify-around z-50">
        <button onClick={() => setView('home')} className={`flex flex-col items-center ${view === 'home' ? 'text-gym-accent' : 'text-gray-500'}`}>
          <Home size={24} />
          <span className="text-[10px] font-bold mt-1">Gym</span>
        </button>
        <button className="flex flex-col items-center text-gray-500">
          <Calendar size={24} />
          <span className="text-[10px] font-bold mt-1">Schedule</span>
        </button>
        <button className="flex flex-col items-center text-gray-500">
          <BarChart2 size={24} />
          <span className="text-[10px] font-bold mt-1">Progress</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
