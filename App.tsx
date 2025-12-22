
import React, { useState, useEffect, useRef } from 'react';
import { Dumbbell, Calendar, BarChart2, Plus, Settings, ChevronRight, Layout, X, Clock, Save, AlertTriangle, Cloud, RefreshCw } from 'lucide-react';
import { WorkoutSession, SessionTemplate, ExerciseSessionLog, Exercise, MuscleGroup, Equipment } from './types';
import { getTemplates, getSessions, saveSession, deleteSession, getLastLogForExercise, deleteTemplate, saveActiveSessionDraft, getActiveSessionDraft, initializeFromCloud, pushLocalDataToCloud, getCustomExercises, saveCustomExercise } from './services/storageService';
import { EXERCISES, FATIGUE_FACTOR, WEIGHT_INCREMENT, DEFAULT_TEMPLATES, getWeightIncrement, getMinWeight, DUMBBELL_MIN_WEIGHT } from './constants';
import { SessionCard } from './components/SessionCard';
import { ExerciseCard } from './components/ExerciseCard';
import { SessionPlanner } from './components/SessionPlanner';
import { ScheduleView } from './components/ScheduleView';
import { ProgressView } from './components/ProgressView';

const App: React.FC = () => {
  // Initialize state from local storage draft if available to handle reloads/crashes
  // Ensure we patch old drafts with UIDs for DnD stability
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(() => {
    const draft = getActiveSessionDraft();
    if (draft) {
         draft.exercises = draft.exercises.map(e => ({
            ...e, 
            uid: e.uid || Math.random().toString(36).substr(2, 9)
         }));
    }
    return draft;
  });

  const [view, setView] = useState<'home' | 'planner' | 'active' | 'schedule' | 'progress'>(() => {
    // If we have a draft, force view to active immediately
    return getActiveSessionDraft() ? 'active' : 'home';
  });
  
  const [viewSessionId, setViewSessionId] = useState<string | null>(null);

  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<SessionTemplate | null>(null);
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState(false);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscle, setNewExerciseMuscle] = useState<string>('Chest');
  const [newExerciseEquipment, setNewExerciseEquipment] = useState<string>('Machine');
  const [historicalDate, setHistoricalDate] = useState<Date | null>(null);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  
  // Ref to track if initial load is done to prevent overwriting draft with null on first render if async issues existed (though useState initializer handles it)
  const isInitialMount = useRef(true);

  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  useEffect(() => {
    const syncFromCloud = async () => {
      setIsCloudSyncing(true);
      try {
        await initializeFromCloud();
        refreshData();
      } catch (err) {
        console.error('Cloud sync failed:', err);
      } finally {
        setIsCloudSyncing(false);
      }
    };
    syncFromCloud();
  }, []);

  useEffect(() => {
    refreshData();
  }, [view]);

  // Auto-save draft whenever activeSession changes
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
    }
    saveActiveSessionDraft(activeSession);
  }, [activeSession]);

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
    setCustomExercises(getCustomExercises());
  };

  const handleCreateExercise = () => {
    if (!newExerciseName.trim()) return;
    const id = 'custom-' + Date.now();
    const exercise: Exercise = {
      id,
      name: newExerciseName.trim(),
      muscleGroup: newExerciseMuscle as MuscleGroup,
      equipment: newExerciseEquipment as Equipment,
      isCompound: false,
      defaultAlternatives: []
    };
    saveCustomExercise(exercise);
    setCustomExercises(getCustomExercises());
    setNewExerciseName('');
    setIsCreateExerciseOpen(false);
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

  const startSession = (template: SessionTemplate, customDate?: Date) => {
    const rawExercises: ExerciseSessionLog[] = template.exerciseIds.map((exId, idx) => {
      // 1. Get History
      const lastLog = getLastLogForExercise(exId);
      
      // 2. Get exercise definition to determine equipment-specific settings
      const exerciseDef = EXERCISES[exId] || customExercises.find(e => e.id === exId);
      const equipmentType = exerciseDef?.equipment as Equipment;
      const weightIncrement = getWeightIncrement(equipmentType);
      const minWeight = getMinWeight(equipmentType);
      
      // 3. Determine Base Weight (Fresh Strength)
      // If user successfully did 4x12 last time, we increase the BASE weight.
      // Default weight depends on equipment type (4kg min for dumbbells, 20kg for others)
      let baseWeight = lastLog ? (lastLog.baseWeight || lastLog.weight) : (equipmentType === Equipment.DUMBBELL ? DUMBBELL_MIN_WEIGHT : 20);
      
      if (lastLog && lastLog.success) {
        baseWeight += weightIncrement; 
      }
      
      // Ensure minimum weight
      baseWeight = Math.max(minWeight, baseWeight);

      return {
        uid: Math.random().toString(36).substr(2, 9),
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

    // If customDate is provided, use it. Otherwise use now.
    const sessionDate = customDate ? customDate.toISOString() : new Date().toISOString();

    const newSession: WorkoutSession = {
      id: `ses-${Date.now()}`,
      name: template.name,
      date: sessionDate,
      completed: false,
      duration: 0,
      exercises: adjustedExercises,
      isHistorical: !!customDate
    };
    setActiveSession(newSession);
    setView('active');
    setHistoricalDate(null); // Close modal if open
  };

  const editSession = (session: WorkoutSession) => {
    // Ensure UIDs exist for DnD
    const sessionWithUids = {
        ...session,
        exercises: session.exercises.map(e => ({
            ...e,
            uid: e.uid || Math.random().toString(36).substr(2, 9)
        })),
        isHistorical: true
    };
    setActiveSession(sessionWithUids);
    setView('active');
    setHistoricalDate(null);
  };

  const handleDeleteSession = (sessionId: string) => {
      deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  const handleAddExerciseToSession = (exerciseId: string) => {
    if (!activeSession) return;
    
    // Look up in built-in exercises first, then custom exercises
    const exerciseDef = EXERCISES[exerciseId] || customExercises.find(e => e.id === exerciseId);
    if (!exerciseDef) return;

    // 1. Get equipment-specific settings
    const equipmentType = exerciseDef.equipment as Equipment;
    const weightIncrement = getWeightIncrement(equipmentType);
    const minWeight = getMinWeight(equipmentType);

    // 2. Get History
    const lastLog = getLastLogForExercise(exerciseId);
    
    // 3. Determine Base Weight (4kg min for dumbbells, 20kg for others)
    let baseWeight = lastLog ? (lastLog.baseWeight || lastLog.weight) : (equipmentType === Equipment.DUMBBELL ? DUMBBELL_MIN_WEIGHT : 20); 
    if (lastLog && lastLog.success) {
        baseWeight += weightIncrement; 
    }
    
    // Ensure minimum weight
    baseWeight = Math.max(minWeight, baseWeight);

    const nextOrder = activeSession.exercises.length > 0 
        ? Math.max(...activeSession.exercises.map(e => e.order)) + 1 
        : 0;

    const newExercise: ExerciseSessionLog = {
        uid: Math.random().toString(36).substr(2, 9),
        exerciseId: exerciseId,
        targetSets: 3, // Default for added exercise
        targetReps: 12,
        order: nextOrder,
        baseWeight: baseWeight,
        sets: Array(3).fill(null).map(() => ({
            repsCompleted: 0,
            weight: baseWeight, 
            completed: false
        }))
    };

    // Append and Recalculate
    let newExercises = [...activeSession.exercises, newExercise];
    newExercises = recalculateSessionWeights(newExercises);
    
    setActiveSession({
        ...activeSession,
        exercises: newExercises
    });
    setIsAddExerciseOpen(false);
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

  const handleDeleteExercise = (orderIndex: number) => {
    if (!activeSession) return;
    let newExercises = activeSession.exercises.filter(e => e.order !== orderIndex);
    // Re-assign order values to be sequential
    newExercises = newExercises
      .sort((a, b) => a.order - b.order)
      .map((e, i) => ({ ...e, order: i }));
    // Recalculate weights based on new order
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

  // Drag and Drop Handlers for Active Session
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggingIndex(index);
    // Required for Firefox
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (!activeSession || draggingIndex === null || draggingIndex === index) return;

    // Create a copy of the exercises sorted by their current order
    const sortedExercises = [...activeSession.exercises].sort((a, b) => a.order - b.order);
    
    const draggedItem = sortedExercises[draggingIndex];
    
    // Remove from old position
    sortedExercises.splice(draggingIndex, 1);
    // Insert at new position
    sortedExercises.splice(index, 0, draggedItem);

    // Update order property for all to match new array indices
    sortedExercises.forEach((ex, i) => {
        ex.order = i;
    });

    // Recalculate weights based on new order (fatigue management)
    const recalculated = recalculateSessionWeights(sortedExercises);

    setActiveSession({
        ...activeSession,
        exercises: recalculated
    });
    setDraggingIndex(index);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
  };

  const finishSession = () => {
    if (activeSession) {
      let durationSeconds = 0;
      
      // Only calculate duration if it's NOT a historical log
      if (!activeSession.isHistorical) {
          const startTime = new Date(activeSession.date).getTime();
          const endTime = Date.now();
          durationSeconds = Math.floor((endTime - startTime) / 1000);
      } else {
        // Keep existing duration if editing
        durationSeconds = activeSession.duration;
      }

      saveSession({ ...activeSession, completed: true, duration: durationSeconds });
      
      // Clear active session (this will also clear draft via useEffect)
      setActiveSession(null);
      setView('home');
    }
  };

  const requestCancelSession = () => {
    setShowExitConfirmation(true);
  };

  const confirmCancelSession = () => {
    setShowExitConfirmation(false);
    setActiveSession(null); // This clears draft via useEffect
    setView('home');
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

  const handleDayClick = (day: Date) => {
    // Check if it is today
    const today = new Date();
    const isToday = day.getDate() === today.getDate() && 
                    day.getMonth() === today.getMonth() && 
                    day.getFullYear() === today.getFullYear();
    
    // If it is today, do not open historical log view
    if (isToday) return;

    setHistoricalDate(day);
  };

  const handleRecentActivityClick = (sessionId: string) => {
    setViewSessionId(sessionId);
    setView('progress');
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
          onClick={() => { setView('progress'); setViewSessionId(null); }}
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
        <ProgressView onEdit={editSession} initialSessionId={viewSessionId} />
        {renderNavbar()}
      </div>
    );
  }

  if (view === 'active' && activeSession) {
    const exercisesSorted = [...activeSession.exercises].sort((a, b) => a.order - b.order);
    const isHistorical = activeSession.isHistorical;
    
    return (
      <div className="min-h-screen bg-gym-900 pb-20 relative">
        <header className="sticky top-0 bg-gym-900/90 backdrop-blur-md z-10 px-4 py-3 border-b border-gym-700 relative flex justify-between items-center shadow-sm h-16">
          
          <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
            <button 
                type="button"
                onClick={requestCancelSession}
                className="w-10 h-10 flex items-center justify-center rounded-full text-gym-muted hover:text-white hover:bg-gym-800 active:bg-gym-700 transition-colors z-50 cursor-pointer"
                aria-label="Cancel Session"
            >
                <X size={24} />
            </button>
            <div className="flex flex-col min-w-0 overflow-hidden">
                <h1 className="text-gym-text font-bold text-lg truncate leading-tight">{activeSession.name}</h1>
                {isHistorical && <span className="text-[10px] bg-gym-accent text-white px-1.5 py-0.5 rounded font-bold uppercase w-fit">Log Mode</span>}
            </div>
          </div>

          <div className="flex-shrink-0">
            <button 
                onClick={finishSession} 
                className={`text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all active:scale-95 flex items-center gap-2
                ${isHistorical ? 'bg-gym-secondary hover:bg-gym-accent shadow-orange-500/20' : 'bg-gym-success hover:bg-green-600 shadow-green-500/20'}
                `}
            >
              {isHistorical ? <Save size={16} /> : null}
              {isHistorical ? 'Save Log' : 'Finish'}
            </button>
          </div>
        </header>
        
        <div className="p-4 space-y-4">
          {exercisesSorted.map((log, i) => (
            <ExerciseCard
              key={log.uid || `${log.exerciseId}-${log.order}`}
              index={log.order}
              log={log}
              totalExercises={exercisesSorted.length}
              availableExercises={exercisesSorted}
              customExercises={customExercises}
              onUpdateLog={updateActiveLog}
              onSwapExercise={handleSwapExercise}
              onReorderSwap={handleReorderSwap}
              onDelete={handleDeleteExercise}
              isDragging={draggingIndex === i}
              dragHandlers={{
                onDragStart: (e) => handleDragStart(e, i),
                onDragOver: (e) => handleDragOver(e, i),
                onDragEnd: handleDragEnd
              }}
            />
          ))}
          
          <div className="text-center p-4">
             <button 
               onClick={() => setIsAddExerciseOpen(true)}
               className="text-gym-muted text-sm flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-gym-700 rounded-xl hover:border-gym-accent hover:text-gym-accent bg-gym-800/50">
               <Plus size={18} /> Add Exercise to Session
             </button>
          </div>
        </div>

        {/* Exit Confirmation Modal */}
        {showExitConfirmation && (
            <div className="fixed inset-0 bg-gym-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
                <div className="bg-gym-800 w-full max-w-sm rounded-2xl border border-gym-700 shadow-2xl overflow-hidden p-6 text-center">
                    <div className="w-16 h-16 bg-gym-warning/10 text-gym-warning rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gym-text mb-2">Exit Session?</h3>
                    <p className="text-gym-muted mb-6">Progress for this session will be lost if you exit without finishing.</p>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowExitConfirmation(false)}
                            className="flex-1 py-3 font-bold text-gym-text bg-gym-700 rounded-xl hover:bg-gym-600 transition-colors"
                        >
                            Stay
                        </button>
                        <button 
                            onClick={confirmCancelSession}
                            className="flex-1 py-3 font-bold text-white bg-gym-danger rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                        >
                            Exit
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Add Exercise Modal for Active Session */}
        {isAddExerciseOpen && (
          <div className="fixed inset-0 bg-gym-900 z-[80] flex flex-col animate-in fade-in duration-200">
            <div className="bg-gym-800 p-4 pt-10 flex justify-between items-center shadow-sm border-b border-gym-700">
               <h3 className="text-gym-text font-bold">Add Exercise</h3>
               <div className="flex gap-2">
                 <button 
                   onClick={() => setIsCreateExerciseOpen(true)} 
                   className="px-3 py-2 bg-gym-accent text-white rounded-lg text-sm font-bold hover:bg-orange-600 flex items-center gap-1"
                 >
                   <Plus size={16} /> New
                 </button>
                 <button onClick={() => setIsAddExerciseOpen(false)} className="p-2 bg-gym-700 rounded-full text-gym-text hover:bg-gym-600"><X size={20} /></button>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                // Only show these muscle groups
                const allowedGroups = ['Legs', 'Chest', 'Shoulders', 'Back', 'Lats', 'Upper Back', 'Triceps', 'Biceps', 'Core'];
                // Combine built-in and custom exercises
                const allExercises = [...Object.values(EXERCISES), ...customExercises];
                // Group exercises by muscle group
                const grouped: Record<string, Exercise[]> = {};
                allExercises.forEach(ex => {
                  if (!allowedGroups.includes(ex.muscleGroup)) return;
                  // Consolidate back-related groups under "Back"
                  const displayGroup = ['Lats', 'Upper Back', 'Lower Back'].includes(ex.muscleGroup) ? 'Back' : ex.muscleGroup;
                  if (!grouped[displayGroup]) grouped[displayGroup] = [];
                  grouped[displayGroup].push(ex);
                });
                // Custom sort order
                const groupOrder = ['Chest', 'Back', 'Shoulders', 'Legs', 'Biceps', 'Triceps', 'Core'];
                const sortedGroups = Object.keys(grouped).sort((a, b) => groupOrder.indexOf(a) - groupOrder.indexOf(b));
                return sortedGroups.map(group => (
                  <div key={group} className="mb-6">
                    <h4 className="text-gym-accent font-bold text-sm uppercase tracking-wider mb-2 sticky top-0 bg-gym-900 py-2">{group}</h4>
                    <div className="space-y-1">
                      {grouped[group].sort((a, b) => a.name.localeCompare(b.name)).map(ex => (
                        <button
                          key={ex.id}
                          onClick={() => handleAddExerciseToSession(ex.id)}
                          className="w-full text-left p-3 rounded-lg bg-gym-800 border border-gym-700 hover:border-gym-accent active:bg-gym-700 transition-colors flex justify-between items-center"
                        >
                          <div>
                            <div className="font-bold text-gym-text">{ex.name}</div>
                            <div className="text-xs text-gym-muted mt-0.5">{ex.equipment}{ex.id.startsWith('custom-') ? ' • Custom' : ''}</div>
                          </div>
                          <Plus size={16} className="text-gym-accent"/>
                        </button>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Create Custom Exercise Modal */}
        {isCreateExerciseOpen && (
          <div className="fixed inset-0 bg-black/70 z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-gym-800 rounded-xl w-full max-w-md border border-gym-700 shadow-xl">
              <div className="p-4 border-b border-gym-700 flex justify-between items-center">
                <h3 className="text-gym-text font-bold">Create Custom Exercise</h3>
                <button onClick={() => setIsCreateExerciseOpen(false)} className="p-2 bg-gym-700 rounded-full text-gym-text hover:bg-gym-600"><X size={18} /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm text-gym-muted mb-1">Exercise Name</label>
                  <input
                    type="text"
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    placeholder="e.g. Incline Hammer Curls"
                    className="w-full p-3 bg-gym-900 border border-gym-700 rounded-lg text-gym-text focus:border-gym-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gym-muted mb-1">Muscle Group</label>
                  <select
                    value={newExerciseMuscle}
                    onChange={(e) => setNewExerciseMuscle(e.target.value)}
                    className="w-full p-3 bg-gym-900 border border-gym-700 rounded-lg text-gym-text focus:border-gym-accent focus:outline-none"
                  >
                    <option value="Chest">Chest</option>
                    <option value="Back">Back</option>
                    <option value="Lats">Back (Lats)</option>
                    <option value="Upper Back">Back (Upper)</option>
                    <option value="Shoulders">Shoulders</option>
                    <option value="Legs">Legs</option>
                    <option value="Biceps">Biceps</option>
                    <option value="Triceps">Triceps</option>
                    <option value="Core">Core / Abs</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gym-muted mb-1">Equipment</label>
                  <select
                    value={newExerciseEquipment}
                    onChange={(e) => setNewExerciseEquipment(e.target.value)}
                    className="w-full p-3 bg-gym-900 border border-gym-700 rounded-lg text-gym-text focus:border-gym-accent focus:outline-none"
                  >
                    <option value="Machine">Machine</option>
                    <option value="Cable Machine">Cable Machine</option>
                    <option value="Barbell">Barbell</option>
                    <option value="Dumbbell">Dumbbell</option>
                    <option value="Smith Machine">Smith Machine</option>
                    <option value="Bodyweight">Bodyweight</option>
                    <option value="Kettlebell">Kettlebell</option>
                  </select>
                </div>
                <button
                  onClick={handleCreateExercise}
                  disabled={!newExerciseName.trim()}
                  className="w-full py-3 bg-gym-accent text-white font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create Exercise
                </button>
              </div>
            </div>
          </div>
        )}
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
          <div className="flex gap-2">
            <button 
              onClick={async () => {
                setIsCloudSyncing(true);
                const result = await pushLocalDataToCloud();
                alert(result.message);
                setIsCloudSyncing(false);
              }}
              disabled={isCloudSyncing}
              className="p-2 bg-gym-800 rounded-full text-gym-muted hover:text-gym-accent border border-gym-700 disabled:opacity-50"
              title="Sync to Cloud"
            >
              {isCloudSyncing ? <RefreshCw size={20} className="animate-spin" /> : <Cloud size={20} />}
            </button>
            <button className="p-2 bg-gym-800 rounded-full text-gym-muted hover:text-gym-accent border border-gym-700">
              <Settings size={20} />
            </button>
          </div>
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
                 <button 
                    key={i} 
                    onClick={() => handleDayClick(day)}
                    className={`h-16 rounded-lg flex flex-col items-center justify-center border transition-all active:scale-95 ${isToday ? 'border-gym-accent bg-gym-800 shadow-md' : 'border-transparent bg-gym-800/50 hover:bg-gym-800 hover:border-gym-700'}`}
                 >
                   <span className="text-[10px] uppercase text-gym-muted font-bold">{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                   <span className={`font-bold text-sm ${hasSession ? 'text-gym-success' : 'text-gym-text'}`}>{day.getDate()}</span>
                   {hasSession && <div className="w-1 h-1 rounded-full bg-gym-success mt-1"></div>}
                 </button>
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
                <button 
                  key={s.id} 
                  onClick={() => handleRecentActivityClick(s.id)}
                  className="w-full text-left bg-gym-800 p-4 rounded-xl border border-gym-700 flex justify-between items-center shadow-sm hover:border-gym-accent hover:shadow-md transition-all group"
                >
                   <div>
                     <h4 className="font-bold text-gym-text group-hover:text-gym-accent transition-colors">{s.name}</h4>
                     <p className="text-xs text-gym-muted">{new Date(s.date).toLocaleDateString()}</p>
                   </div>
                   <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="text-gym-success font-bold text-sm">Completed</div>
                        <div className="text-xs text-gym-muted">{s.duration ? formatTime(s.duration) : '~'}</div>
                      </div>
                      <ChevronRight size={18} className="text-gym-muted group-hover:text-gym-accent" />
                   </div>
                </button>
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
                                    <p className="text-xs text-gym-muted">{tpl.exerciseIds.length} Exercises</p>
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
      
      {/* Historical Log Modal */}
      {historicalDate && (
        <div className="fixed inset-0 bg-gym-900 z-[70] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="bg-gym-800 p-4 pt-10 flex justify-between items-center shadow-sm border-b border-gym-700">
                <div>
                    <h2 className="text-xl font-bold text-gym-text">Log Past Workout</h2>
                    <p className="text-sm text-gym-muted flex items-center gap-2">
                        <Calendar size={14} /> {historicalDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <button onClick={() => setHistoricalDate(null)} className="p-2 bg-gym-700 rounded-full text-gym-text hover:bg-gym-600">
                    <X size={20} />
                </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
                {/* Existing Sessions for this Date */}
                {sessions.filter(s => {
                    const d = new Date(s.date);
                    return d.getDate() === historicalDate.getDate() &&
                           d.getMonth() === historicalDate.getMonth() &&
                           d.getFullYear() === historicalDate.getFullYear();
                }).length > 0 && (
                    <div className="mb-6">
                        <h3 className="font-bold text-lg text-gym-text mb-2">Completed Workouts</h3>
                        <div className="space-y-3">
                            {sessions.filter(s => {
                                const d = new Date(s.date);
                                return d.getDate() === historicalDate.getDate() &&
                                    d.getMonth() === historicalDate.getMonth() &&
                                    d.getFullYear() === historicalDate.getFullYear();
                            }).map(s => (
                                <SessionCard
                                    key={s.id}
                                    title={s.name}
                                    subtitle={`${s.exercises.length} Exercises • ${s.completed ? 'Completed' : 'Incomplete'}`}
                                    onStart={() => editSession(s)}
                                    actionIcon="edit"
                                    onDelete={() => handleDeleteSession(s.id)}
                                />
                            ))}
                        </div>
                        <div className="h-px bg-gym-700/50 my-4"></div>
                    </div>
                )}

                <div className="mb-4">
                    <h3 className="font-bold text-lg text-gym-text mb-2">Log New Routine</h3>
                    <p className="text-sm text-gym-muted">Choose a routine to log for this day.</p>
                </div>

                <div className="space-y-3">
                    {templates.length === 0 ? (
                    <div className="p-8 bg-gym-800 rounded-xl text-center border border-dashed border-gym-700">
                        <p className="text-gym-muted">No routines available. Create one in the main view first.</p>
                    </div>
                    ) : (
                    templates.map(tpl => (
                        <SessionCard
                        key={tpl.id}
                        title={tpl.name}
                        subtitle={`${tpl.exerciseIds.length} Exercises`}
                        onStart={() => startSession(tpl, historicalDate)}
                        actionIcon="plus"
                        isTemplate
                        onEdit={() => handleEditTemplate(tpl)}
                        onDelete={() => handleDeleteTemplate(tpl.id)}
                        />
                    ))
                    )}
                </div>
            </div>
        </div>
      )}

      {renderNavbar()}
    </div>
  );
};

export default App;
