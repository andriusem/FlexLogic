import React, { useState } from 'react';
import { ExerciseSessionLog, SetLog, MuscleGroup, Equipment } from '../types';
import { EXERCISES, WEIGHT_INCREMENT } from '../constants';
import { Check, Dumbbell, RefreshCw, AlertCircle, X, Brain, ChevronDown, Plus, Minus } from 'lucide-react';
import { getAlternativeExercise } from '../services/geminiService';

interface Props {
  log: ExerciseSessionLog;
  index: number;
  onUpdateLog: (updatedLog: ExerciseSessionLog) => void;
  onSwapExercise: (currentIndex: number, newExerciseId: string) => void;
  onReorderSwap: (fromIndex: number, toIndex: number) => void;
  totalExercises: number;
  availableExercises: ExerciseSessionLog[];
}

export const ExerciseCard: React.FC<Props> = ({ 
  log, 
  index, 
  onUpdateLog, 
  onSwapExercise, 
  onReorderSwap,
  totalExercises,
  availableExercises
}) => {
  const exercise = EXERCISES[log.exerciseId];
  const [showSwapMenu, setShowSwapMenu] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  if (!exercise) return <div className="text-red-500 p-4">Exercise definition missing for {log.exerciseId}</div>;

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
        return { ...s, weight: Math.max(0, s.weight + delta) };
    });
    onUpdateLog({ ...log, sets: newSets });
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
    <div className="bg-gym-800 rounded-xl p-0 mb-4 border border-gym-700 shadow-sm relative overflow-hidden transition-all duration-300">
       {/* Card Header */}
       <div className="flex justify-between items-start p-4 bg-gym-800">
         <div>
           <div className="flex items-center gap-2 mb-1">
             <span className="text-[10px] font-bold text-white bg-gym-accent px-1.5 py-0.5 rounded">
               #{index + 1}
             </span>
             <h4 className="text-gym-text font-bold text-lg leading-tight">{exercise.name}</h4>
           </div>
           <div className="flex items-center gap-2 text-gym-muted text-xs">
             <span className="bg-gym-700 px-1.5 py-0.5 rounded text-gym-text">{exercise.equipment}</span>
             <span>•</span>
             <span>{exercise.muscleGroup}</span>
           </div>
         </div>
         <button 
          onClick={() => setShowSwapMenu(!showSwapMenu)}
          className={`p-2 rounded-lg transition-colors ${showSwapMenu ? 'bg-gym-700 text-gym-text' : 'text-gym-muted hover:text-gym-accent'}`}
        >
           <RefreshCw size={18} />
         </button>
       </div>

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
                    onClick={() => adjustWeight(-WEIGHT_INCREMENT)} 
                    className="p-1 text-gym-muted hover:text-gym-accent active:scale-90 transition-transform"
                    aria-label="Decrease weight"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-gym-text text-center tracking-tighter flex-1 truncate">{displayWeight}</span>
                  <button 
                    onClick={() => adjustWeight(WEIGHT_INCREMENT)} 
                    className="p-1 text-gym-accent hover:text-gym-secondary active:scale-90 transition-transform"
                    aria-label="Increase weight"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <span className="text-[10px] text-gym-muted">kg</span>
            </div>

            <div className="bg-gym-800 rounded-xl p-2 border border-gym-700 flex flex-col items-center justify-center relative">
            <span className="text-gym-muted text-[10px] uppercase font-bold tracking-wider absolute top-2">Target</span>
            <div className="text-gym-text font-bold mt-4 text-xl">
                {log.targetSets} <span className="text-gym-muted text-sm">x</span> {log.targetReps}
            </div>
            <span className="text-[10px] text-gym-muted mt-1">sets x reps</span>
            </div>
        </div>

        {/* Sets Grid */}
        <div className="flex justify-between gap-2">
            {log.sets.map((set, i) => (
            <button
                key={i}
                onClick={() => handleSetToggle(i)}
                className={`
                flex-1 h-14 rounded-lg flex flex-col items-center justify-center transition-all duration-200 border relative overflow-hidden group
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