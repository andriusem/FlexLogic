
import React, { useState, useEffect } from 'react';
import { ExerciseSessionLog, SetLog, MuscleGroup, Equipment } from '../types';
import { EXERCISES, getWeightIncrement, getMinWeight } from '../constants';
import { Check, Dumbbell, RefreshCw, AlertCircle, X, Brain, ChevronDown, Plus, Minus, GripVertical, Trash2, History, TrendingUp, Calendar } from 'lucide-react';
import { getAlternativeExercise } from '../services/geminiService';

interface Props {
  log: ExerciseSessionLog;
  index: number;
  onUpdateLog: (updatedLog: ExerciseSessionLog) => void;
  onSwapExercise: (currentIndex: number, newExerciseId: string) => void;
  onReorderSwap: (fromIndex: number, toIndex: number) => void;
  onDelete?: (index: number) => void;
  totalExercises: number;
  availableExercises: ExerciseSessionLog[];
  customExercises?: { id: string; name: string; muscleGroup: string; equipment: string }[];
  isDragging?: boolean;
  dragHandlers?: {
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
  };
  getExerciseHistory?: (exerciseId: string, limit?: number) => any[];
}

export const ExerciseCard: React.FC<Props> = ({
  log,
  index,
  onUpdateLog,
  onSwapExercise,
  onReorderSwap,
  onDelete,
  totalExercises,
  availableExercises,
  customExercises = [],
  isDragging,
  dragHandlers,
  getExerciseHistory
}) => {
  const exercise = EXERCISES[log.exerciseId] || customExercises.find(e => e.id === log.exerciseId);
  const [showSwapMenu, setShowSwapMenu] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);

  // Load history when component mounts or when history panel is opened
  useEffect(() => {
    if (showHistory && getExerciseHistory) {
      const history = getExerciseHistory(log.exerciseId, 3);
      setHistoryData(history);
    }
  }, [showHistory, log.exerciseId, getExerciseHistory]);

  if (!exercise) return <div className="text-red-500 p-4">Exercise not found: {log.exerciseId}</div>;

  // Get last workout data for quick reference
  const lastWorkout = getExerciseHistory ? getExerciseHistory(log.exerciseId, 1)[0] : null;

  // Progressive Overload Logic (Visual Indicator)
  const isOverloadReady = log.sets.every(s => s.repsCompleted >= log.targetReps && s.completed);

  // Determine which weight to display (Current active set or last set)
  const currentSetIndex = log.sets.findIndex(s => !s.completed);
  const displayIndex = currentSetIndex === -1 ? log.sets.length - 1 : currentSetIndex;
  const displayWeight = log.sets[displayIndex]?.weight || 0;

  const handleSetToggle = (setIndex: number) => {
    const newSets = [...log.sets];
    const set = newSets[setIndex];
    
    // Toggle state logic:
    // 1. If not completed -> Mark completed with Target Reps
    // 2. If completed and reps > 1 -> Decrease by 1
    // 3. If completed and reps is 1 -> Reset to Incomplete
    
    if (!set.completed) {
      set.completed = true;
      set.repsCompleted = log.targetReps;
    } else if (set.repsCompleted > 1) {
       // Decrease reps
       set.repsCompleted -= 1;
    } else {
       // Reset
      set.completed = false;
      set.repsCompleted = 0;
    }
    
    onUpdateLog({ ...log, sets: newSets });
  };

  // Get equipment-specific weight increment and minimum
  const equipmentType = exercise.equipment as Equipment;
  const weightIncrement = getWeightIncrement(equipmentType);
  const minWeight = getMinWeight(equipmentType);

  const adjustWeight = (delta: number) => {
    // Only adjust future/incomplete sets to preserve history of completed sets.
    // If we haven't started (index 0), adjust all.
    // If we finished set 1, adjust set 2, 3, 4.
    
    let startIndex = log.sets.findIndex(s => !s.completed);
    
    // If all are completed, assume user wants to correct the last set or adjust plan for a redo?
    // Let's default to adjusting the last set if all are done, to allow correction.
    if (startIndex === -1) {
        startIndex = log.sets.length - 1;
    }

    const newSets = log.sets.map((s, i) => {
        // Don't touch completed sets before the active one
        if (i < startIndex) return s; 
        return { ...s, weight: Math.max(minWeight, s.weight + delta) };
    });
    onUpdateLog({ ...log, sets: newSets });
  };

  const adjustSetCount = (delta: number) => {
    const currentCount = log.sets.length;
    const newCount = currentCount + delta;
    
    if (newCount < 1) return; // Minimum 1 set

    let newSets = [...log.sets];

    if (delta > 0) {
        // Adding sets
        // Inherit weight from the last set
        const lastWeight = newSets[newSets.length - 1]?.weight || log.baseWeight;
        const setsToAdd = Array(delta).fill(null).map(() => ({
            repsCompleted: 0,
            weight: lastWeight,
            completed: false
        }));
        newSets = [...newSets, ...setsToAdd];
    } else {
        // Removing sets (remove from end)
        newSets = newSets.slice(0, delta); // delta is negative here
    }

    onUpdateLog({ 
        ...log, 
        sets: newSets, 
        targetSets: newCount 
    });
  };

  const handleAiSuggest = async () => {
    setAiLoading(true);
    const result = await getAlternativeExercise(exercise, exercise.equipment);
    setAiLoading(false);
    if (result) {
      setAiSuggestion(`${result.alternativeName}\n${result.reason}`);
    } else {
      setAiSuggestion("No AI suggestion available (Check API Key).");
    }
  };

  const getSetColorClass = (set: SetLog) => {
    if (!set.completed) {
      return 'bg-gym-800 border-gym-700 text-gym-muted hover:border-gym-accent hover:text-gym-accent';
    }
    // Green for 10, 11, 12+
    if (set.repsCompleted >= 10) {
      return 'bg-gym-success border-gym-success text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]';
    }
    // Yellow for 8, 9
    if (set.repsCompleted >= 8) {
      return 'bg-gym-warning border-gym-warning text-white';
    }
    // Red for < 8
    return 'bg-gym-danger border-gym-danger text-white';
  };

  return (
    <div 
        draggable={!!dragHandlers}
        onDragStart={dragHandlers?.onDragStart}
        onDragOver={dragHandlers?.onDragOver}
        onDragEnd={dragHandlers?.onDragEnd}
        className={`bg-gym-800 rounded-xl p-0 mb-4 border border-gym-700 shadow-sm relative overflow-hidden transition-all duration-300 
            ${isDragging ? 'opacity-40 border-dashed border-gym-accent scale-[0.98]' : ''}
        `}
    >
       {/* Card Header */}
       <div className="flex justify-between items-start p-4 bg-gym-800">
         <div className="flex gap-3 flex-1">
             {/* Drag Handle */}
             {dragHandlers && (
                 <div className="text-gym-muted hover:text-gym-accent cursor-grab active:cursor-grabbing mt-1 -ml-1 flex-shrink-0">
                     <GripVertical size={20} />
                 </div>
             )}
             
             <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-white bg-gym-accent px-1.5 py-0.5 rounded flex-shrink-0">
                    #{index + 1}
                    </span>
                    <h4 className="text-gym-text font-bold text-lg leading-tight truncate">{exercise.name}</h4>
                </div>
                <div className="flex items-center gap-2 text-gym-muted text-xs">
                    <span className="bg-gym-700 px-1.5 py-0.5 rounded text-gym-text">{exercise.equipment}</span>
                    <span>•</span>
                    <span>{exercise.muscleGroup}</span>
                </div>
                {lastWorkout && (
                  <div className="flex items-center gap-2 text-[10px] mt-1 text-gym-muted/80">
                    <span>Last: {lastWorkout.baseWeight}kg × {lastWorkout.targetSets} sets</span>
                    {lastWorkout.allRepsMet && (
                      <span className="text-gym-success">✓</span>
                    )}
                  </div>
                )}
             </div>
         </div>

         <button
          onClick={() => setShowHistory(!showHistory)}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ml-2 ${showHistory ? 'bg-gym-700 text-gym-text' : 'text-gym-muted hover:text-gym-accent'}`}
          title="View History"
        >
           <History size={18} />
         </button>
         <button
          onClick={() => setShowSwapMenu(!showSwapMenu)}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${showSwapMenu ? 'bg-gym-700 text-gym-text' : 'text-gym-muted hover:text-gym-accent'}`}
        >
           <RefreshCw size={18} />
         </button>
         {onDelete && (
           <button 
             onClick={() => {
               if (confirm(`Remove ${exercise.name} from this workout?`)) {
                 onDelete(index);
               }
             }}
             className="p-2 rounded-lg transition-colors flex-shrink-0 text-gym-muted hover:text-red-400 hover:bg-red-500/10"
             title="Remove exercise"
           >
             <Trash2 size={18} />
           </button>
         )}
       </div>

       {/* Exercise History Panel */}
       {showHistory && (
         <div className="bg-gym-900 border-y border-gym-700 p-4 animate-in slide-in-from-top duration-200">
           <div className="flex justify-between items-center mb-3">
             <h5 className="font-bold text-gym-text text-sm flex items-center gap-2">
               <History size={16} />
               Recent History
             </h5>
           </div>

           {historyData.length === 0 ? (
             <p className="text-xs text-gym-muted italic">No previous workouts found for this exercise.</p>
           ) : (
             <div className="space-y-3">
               {historyData.map((workout, idx) => {
                 const workoutDate = new Date(workout.date);
                 const daysAgo = Math.floor((Date.now() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
                 const dateStr = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;

                 // Calculate progress compared to current session
                 const currentWeight = log.baseWeight || log.sets[0]?.weight || 0;
                 const previousWeight = workout.baseWeight || 0;
                 const weightDiff = currentWeight - previousWeight;
                 const isProgress = weightDiff > 0;

                 return (
                   <div
                     key={idx}
                     className={`p-3 bg-gym-800 rounded-lg border ${idx === 0 ? 'border-gym-accent/50' : 'border-gym-700'}`}
                   >
                     {/* Header - Date and Progress Indicator */}
                     <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2 text-[10px] text-gym-muted">
                         <Calendar size={12} />
                         <span>{dateStr}</span>
                         {idx === 0 && (
                           <span className="bg-gym-accent/20 text-gym-accent px-1.5 py-0.5 rounded font-bold">
                             LAST
                           </span>
                         )}
                       </div>
                       {idx === 0 && weightDiff !== 0 && (
                         <div className={`flex items-center gap-1 text-[10px] font-bold ${isProgress ? 'text-gym-success' : 'text-gym-danger'}`}>
                           <TrendingUp size={12} className={isProgress ? '' : 'rotate-180'} />
                           {isProgress ? '+' : ''}{weightDiff.toFixed(1)}kg
                         </div>
                       )}
                     </div>

                     {/* Session Name */}
                     <div className="text-xs font-bold text-gym-text mb-2">
                       {workout.sessionName}
                     </div>

                     {/* Sets Performance */}
                     <div className="grid grid-cols-4 gap-1 mb-2">
                       {workout.sets.map((set: any, setIdx: number) => (
                         <div
                           key={setIdx}
                           className={`text-center py-1 rounded text-[10px] font-mono ${
                             set.completed
                               ? set.repsCompleted >= workout.targetReps
                                 ? 'bg-gym-success/20 text-gym-success'
                                 : 'bg-gym-warning/20 text-gym-warning'
                               : 'bg-gym-700 text-gym-muted'
                           }`}
                         >
                           {set.completed ? `${set.repsCompleted}×${set.weight}kg` : '-'}
                         </div>
                       ))}
                     </div>

                     {/* Summary Stats */}
                     <div className="flex items-center justify-between text-[10px] text-gym-muted">
                       <span>
                         {workout.completedSets}/{workout.targetSets} sets • {workout.totalReps} total reps
                       </span>
                       {workout.allRepsMet && (
                         <span className="text-gym-success flex items-center gap-1">
                           <Check size={10} /> Target hit
                         </span>
                       )}
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
         </div>
       )}

       {/* Swap/Occupied Menu */}
       {showSwapMenu && (
         <div className="bg-gym-900 border-y border-gym-700 p-4 animate-in slide-in-from-top duration-200">
           <div className="flex justify-between items-center mb-4">
             <h5 className="font-bold text-gym-text text-sm">Machine Occupied / Swap</h5>
           </div>
           
           <div className="space-y-3">
             {/* Option 1: Swap with predefined */}
             <div>
               <p className="text-[10px] text-gym-muted mb-2 uppercase font-bold tracking-wider">Similar Alternatives</p>
               <div className="grid grid-cols-1 gap-2">
               {exercise.defaultAlternatives.length > 0 ? (
                 exercise.defaultAlternatives.map(altId => (
                   EXERCISES[altId] && (
                    <button 
                      key={altId}
                      onClick={() => { onSwapExercise(index, altId); setShowSwapMenu(false); }}
                      className="w-full text-left p-2.5 bg-gym-800 rounded-lg border border-gym-700 hover:border-gym-accent flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-sm text-gym-text">{EXERCISES[altId].name}</div>
                        <div className="text-[10px] text-gym-muted">{EXERCISES[altId].equipment}</div>
                      </div>
                      <RefreshCw size={14} className="text-gym-accent"/>
                    </button>
                   )
                 ))
               ) : (
                 <p className="text-xs text-gym-muted italic">No predefined alternatives.</p>
               )}
               </div>
             </div>

             {/* Option 2: Swap Order */}
             {availableExercises.filter(e => e.order > index).length > 0 && (
                <div className="mt-4">
                    <p className="text-[10px] text-gym-muted mb-2 uppercase font-bold tracking-wider">Do Later (Swap Order)</p>
                    <div className="space-y-2">
                    {availableExercises.filter(e => e.order > index).map((laterEx) => {
                    const laterName = EXERCISES[laterEx.exerciseId]?.name;
                    return (
                        <button
                        key={laterEx.exerciseId}
                        onClick={() => { onReorderSwap(index, laterEx.order); setShowSwapMenu(false); }}
                        className="w-full text-left p-2.5 bg-gym-800 rounded-lg border border-gym-700 hover:border-gym-warning flex justify-between items-center"
                        >
                        <div>
                            <span className="font-bold text-sm text-gym-text block">Swap with {laterName}</span>
                            <span className="text-[10px] text-gym-muted">Currently #{laterEx.order + 1}</span>
                        </div>
                        <ChevronDown size={14} className="text-gym-warning"/>
                        </button>
                    )
                    })}
                    </div>
                </div>
             )}

             {/* Option 3: AI */}
             <div className="mt-4 pt-4 border-t border-gym-700">
                <button 
                  onClick={handleAiSuggest}
                  disabled={aiLoading}
                  className="flex items-center gap-2 text-xs font-bold text-white w-full justify-center p-3 bg-gradient-to-r from-gym-accent to-gym-secondary rounded-lg shadow-lg hover:brightness-110 transition-all"
                >
                  <Brain size={16} /> {aiLoading ? 'Asking Coach...' : 'Suggest AI Alternative'}
                </button>
                {aiSuggestion && (
                  <div className="mt-3 p-3 bg-gym-800 border border-gym-600 rounded text-xs text-gym-muted whitespace-pre-wrap leading-relaxed">
                    {aiSuggestion}
                  </div>
                )}
             </div>
           </div>
         </div>
       )}

       {/* Controls Area */}
       <div className="bg-white/50 p-4 border-t border-gym-700/50">
        <div className="grid grid-cols-2 gap-3 mb-4">
            {/* WEIGHT CONTROL */}
            <div className="bg-gym-800 rounded-xl p-2 border border-gym-700 flex flex-col items-center justify-center relative">
                <span className="text-gym-muted text-[10px] uppercase font-bold tracking-wider absolute top-2">Weight (Set {displayIndex + 1})</span>
                <div className="flex items-center justify-between w-full mt-6 mb-1 px-0.5">
                  <button 
                    onClick={() => adjustWeight(-weightIncrement)} 
                    className="p-1 text-gym-muted hover:text-gym-accent active:scale-90 transition-transform"
                    aria-label="Decrease weight"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-gym-text text-center tracking-tighter flex-1 truncate">{displayWeight}</span>
                  <button 
                    onClick={() => adjustWeight(weightIncrement)} 
                    className="p-1 text-gym-accent hover:text-gym-secondary active:scale-90 transition-transform"
                    aria-label="Increase weight"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <span className="text-[10px] text-gym-muted">kg</span>
            </div>

            {/* SETS CONTROL */}
            <div className="bg-gym-800 rounded-xl p-2 border border-gym-700 flex flex-col items-center justify-center relative">
                <span className="text-gym-muted text-[10px] uppercase font-bold tracking-wider absolute top-2">Sets</span>
                <div className="flex items-center justify-between w-full mt-6 mb-1 px-1">
                    <button 
                        onClick={() => adjustSetCount(-1)} 
                        className="p-1 text-gym-muted hover:text-gym-accent active:scale-90 transition-transform"
                        aria-label="Decrease sets"
                    >
                        <Minus size={20} />
                    </button>
                    <div className="text-gym-text font-bold text-2xl flex flex-col items-center leading-none">
                        {log.sets.length}
                        <span className="text-[9px] text-gym-muted font-normal mt-1 opacity-70">TARGET</span>
                    </div>
                    <button 
                        onClick={() => adjustSetCount(1)} 
                        className="p-1 text-gym-accent hover:text-gym-secondary active:scale-90 transition-transform"
                        aria-label="Increase sets"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>
        </div>

        {/* Sets Grid */}
        <div className="grid grid-cols-4 gap-2">
            {log.sets.map((set, i) => (
            <button
                key={i}
                onClick={() => handleSetToggle(i)}
                className={`
                h-14 rounded-lg flex flex-col items-center justify-center transition-all duration-200 border relative overflow-hidden group
                ${getSetColorClass(set)}
                `}
            >
                <span className="text-[10px] font-bold mb-0.5 opacity-80">Set {i + 1}</span>
                <span className="text-lg font-mono font-bold leading-none">
                {set.completed ? set.repsCompleted : '-'}
                </span>
            </button>
            ))}
        </div>
       </div>

       {/* Success Indicator */}
       {isOverloadReady && (
         <div className="bg-gym-success/20 p-2 flex items-center justify-center gap-2 text-xs text-gym-success font-bold border-t border-gym-success/30 animate-pulse">
           <Check size={14} /> Progressive Overload: Increase weight next time!
         </div>
       )}
    </div>
  );
};
