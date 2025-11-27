
import React, { useState } from 'react';
import { ExerciseSessionLog, SetLog, MuscleGroup, Equipment } from '../types';
import { EXERCISES, WEIGHT_INCREMENT } from '../constants';
import { Check, Dumbbell, RefreshCw, AlertCircle, X, Brain, ChevronDown } from 'lucide-react';
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

  const handleSetToggle = (setIndex: number) => {
    const newSets = [...log.sets];
    const set = newSets[setIndex];
    
    // Toggle state logic:
    // 1. If not completed -> Mark completed with Target Reps
    // 2. If completed with target reps -> Decrease by 1 (failure simulation)
    // 3. If completed with < target reps -> Reset to 0 (incomplete)
    
    if (!set.completed) {
      set.completed = true;
      set.repsCompleted = log.targetReps;
    } else if (set.repsCompleted >= log.targetReps) {
       // First tap when complete: assume user failed last rep
       set.repsCompleted = log.targetReps - 1;
    } else {
       // Second tap: reset
      set.completed = false;
      set.repsCompleted = 0;
    }
    
    onUpdateLog({ ...log, sets: newSets });
  };

  const adjustWeight = (delta: number) => {
    // Only adjust future/incomplete sets or all sets if none started
    const anyStarted = log.sets.some(s => s.completed);
    
    const newSets = log.sets.map((s, i) => {
        // If set is already done, maybe don't change it? 
        // User request: "adaptable... weight must be lower".
        // Usually we want to adjust all sets if we realize weight is wrong.
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

  return (
    <div className="bg-gym-800 rounded-xl p-0 mb-4 border border-gym-700 shadow-lg relative overflow-hidden transition-all duration-300">
       {/* Card Header */}
       <div className="flex justify-between items-start p-4 bg-gym-800">
         <div>
           <div className="flex items-center gap-2 mb-1">
             <span className="text-[10px] font-bold text-gym-900 bg-gym-accent px-1.5 py-0.5 rounded">
               #{index + 1}
             </span>
             <h4 className="text-white font-bold text-lg leading-tight">{exercise.name}</h4>
           </div>
           <div className="flex items-center gap-2 text-gray-400 text-xs">
             <span className="bg-gym-700 px-1.5 py-0.5 rounded text-gray-300">{exercise.equipment}</span>
             <span>•</span>
             <span>{exercise.muscleGroup}</span>
           </div>
         </div>
         <button 
          onClick={() => setShowSwapMenu(!showSwapMenu)}
          className={`p-2 rounded-lg transition-colors ${showSwapMenu ? 'bg-gym-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
           <RefreshCw size={18} />
         </button>
       </div>

       {/* Swap/Occupied Menu */}
       {showSwapMenu && (
         <div className="bg-gym-900 border-y border-gym-700 p-4 animate-in slide-in-from-top duration-200">
           <div className="flex justify-between items-center mb-4">
             <h5 className="font-bold text-white text-sm">Machine Occupied / Swap</h5>
           </div>
           
           <div className="space-y-3">
             {/* Option 1: Swap with predefined */}
             <div>
               <p className="text-[10px] text-gray-500 mb-2 uppercase font-bold tracking-wider">Similar Alternatives</p>
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
                        <div className="font-bold text-sm text-white">{EXERCISES[altId].name}</div>
                        <div className="text-[10px] text-gray-500">{EXERCISES[altId].equipment}</div>
                      </div>
                      <RefreshCw size={14} className="text-gym-accent"/>
                    </button>
                   )
                 ))
               ) : (
                 <p className="text-xs text-gray-600 italic">No predefined alternatives.</p>
               )}
               </div>
             </div>

             {/* Option 2: Swap Order */}
             {availableExercises.filter(e => e.order > index).length > 0 && (
                <div className="mt-4">
                    <p className="text-[10px] text-gray-500 mb-2 uppercase font-bold tracking-wider">Do Later (Swap Order)</p>
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
                            <span className="font-bold text-sm text-white block">Swap with {laterName}</span>
                            <span className="text-[10px] text-gray-500">Currently #{laterEx.order + 1}</span>
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
                  className="flex items-center gap-2 text-xs font-bold text-white w-full justify-center p-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg"
                >
                  <Brain size={16} /> {aiLoading ? 'Asking Coach...' : 'Suggest AI Alternative'}
                </button>
                {aiSuggestion && (
                  <div className="mt-3 p-3 bg-indigo-900/30 border border-indigo-500/30 rounded text-xs text-indigo-200 whitespace-pre-wrap leading-relaxed">
                    {aiSuggestion}
                  </div>
                )}
             </div>
           </div>
         </div>
       )}

       {/* Controls Area */}
       <div className="bg-gym-900/50 p-4 border-t border-gym-700/50">
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gym-900 rounded-xl p-2 border border-gym-700 flex flex-col items-center justify-center relative">
                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider absolute top-2">Weight</span>
                <div className="flex items-center gap-3 mt-4">
                <button onClick={() => adjustWeight(-WEIGHT_INCREMENT)} className="w-8 h-8 rounded-full bg-gym-800 border border-gym-600 text-white flex items-center justify-center text-lg active:bg-gym-700 active:scale-95 transition-all">-</button>
                <span className="text-xl font-mono font-bold text-white w-14 text-center">{log.sets[0]?.weight || 0}</span>
                <button onClick={() => adjustWeight(WEIGHT_INCREMENT)} className="w-8 h-8 rounded-full bg-gym-800 border border-gym-600 text-white flex items-center justify-center text-lg active:bg-gym-700 active:scale-95 transition-all">+</button>
                </div>
                <span className="text-[10px] text-gray-600 mt-1">kg</span>
            </div>
            <div className="bg-gym-900 rounded-xl p-2 border border-gym-700 flex flex-col items-center justify-center relative">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider absolute top-2">Target</span>
            <div className="text-white font-bold mt-4 text-xl">
                {log.targetSets} <span className="text-gray-600 text-sm">x</span> {log.targetReps}
            </div>
            <span className="text-[10px] text-gray-600 mt-1">sets x reps</span>
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
                ${set.completed && set.repsCompleted >= log.targetReps 
                    ? 'bg-gym-success border-gym-success text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                    : set.completed 
                    ? 'bg-gym-warning/20 border-gym-warning text-gym-warning' 
                    : 'bg-gym-800 border-gym-700 text-gray-500 hover:border-gray-500 hover:bg-gym-700'
                }
                `}
            >
                <span className="text-[10px] font-bold mb-0.5 opacity-60">Set {i + 1}</span>
                <span className="text-lg font-mono font-bold leading-none">
                {set.completed ? set.repsCompleted : '-'}
                </span>
                {/* Visual fill bar for progress if partially complete could go here */}
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
