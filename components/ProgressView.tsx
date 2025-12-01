import React, { useState, useEffect } from 'react';
import { getSessions } from '../services/storageService';
import { WorkoutSession } from '../types';
import { EXERCISES } from '../constants';
import { Calendar, Clock, ChevronDown, TrendingUp, ChevronRight, X, Check, XCircle } from 'lucide-react';

export const ProgressView: React.FC = () => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | 'all'>('all');
  const [exerciseHistory, setExerciseHistory] = useState<any[]>([]);
  const [detailedSession, setDetailedSession] = useState<WorkoutSession | null>(null);

  useEffect(() => {
    // Get completed sessions sorted by date descending
    const allSessions = getSessions().filter(s => s.completed).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setSessions(allSessions);
  }, []);

  useEffect(() => {
    if (selectedExerciseId !== 'all') {
      const history = sessions.reduce((acc: any[], session) => {
        const exLog = session.exercises.find(e => e.exerciseId === selectedExerciseId);
        if (exLog) {
            // Find max weight used
            const maxWeight = Math.max(...exLog.sets.filter(s => s.completed).map(s => s.weight), 0);
            if (maxWeight > 0) {
                acc.push({
                    date: session.date,
                    weight: maxWeight,
                    reps: exLog.sets[0]?.repsCompleted || 0, // Approx reps
                    sets: exLog.sets.filter(s => s.completed).length
                });
            }
        }
        return acc;
      }, []).reverse(); // Oldest to newest for trend
      setExerciseHistory(history);
    }
  }, [selectedExerciseId, sessions]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getUniqueExercises = () => {
    const ids = new Set<string>();
    sessions.forEach(s => s.exercises.forEach(e => ids.add(e.exerciseId)));
    return Array.from(ids).map(id => EXERCISES[id]).filter(Boolean);
  };

  return (
    <div className="min-h-screen bg-gym-900 text-gym-text pb-24 p-6 pt-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gym-secondary">Progress</h1>
        <p className="text-gym-muted">Track your lifts & time</p>
      </header>

      {/* Exercise Performance Selector */}
      <section className="mb-8">
        <h2 className="font-bold text-lg mb-3 flex items-center gap-2 text-gym-text">
            <TrendingUp size={20} className="text-gym-accent" /> Exercise Weight
        </h2>
        <div className="relative mb-4">
            <select 
                className="w-full appearance-none bg-gym-800 text-gym-text p-4 rounded-xl border border-gym-700 focus:border-gym-accent outline-none font-bold"
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
            >
                <option value="all">Select an exercise to see progress...</option>
                {getUniqueExercises().map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gym-muted pointer-events-none" size={20} />
        </div>

        {selectedExerciseId !== 'all' && (
            <div className="bg-gym-800 rounded-xl overflow-hidden border border-gym-700">
                {exerciseHistory.length === 0 ? (
                    <div className="p-4 text-center text-gym-muted">No data found for this exercise.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gym-700/30 text-gym-muted text-xs uppercase font-bold">
                            <tr>
                                <th className="p-3 text-left">Date</th>
                                <th className="p-3 text-right">Weight</th>
                                <th className="p-3 text-right">Reps</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gym-700">
                            {exerciseHistory.map((h, i) => (
                                <tr key={i} className="hover:bg-gym-700/20">
                                    <td className="p-3 text-gym-text">
                                        {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </td>
                                    <td className="p-3 text-right font-bold text-gym-accent">{h.weight} kg</td>
                                    <td className="p-3 text-right text-gym-muted">{h.sets} x {h.reps}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        )}
      </section>

      {/* History List */}
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gym-text">
        <Calendar size={20} className="text-gym-muted" /> Workout History
      </h2>

      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-10 text-gym-muted bg-gym-800/50 rounded-xl border border-dashed border-gym-700">
            No workouts completed yet. Start training!
          </div>
        ) : (
          sessions.map(session => (
            <button 
              key={session.id} 
              onClick={() => setDetailedSession(session)}
              className="w-full text-left bg-gym-800 rounded-xl p-4 border border-gym-700 flex flex-col gap-3 hover:bg-gym-800/80 active:scale-[0.99] transition-all group"
            >
              <div className="flex justify-between items-start border-b border-gym-700 pb-3 w-full">
                <div>
                  <h3 className="font-bold text-gym-text text-lg group-hover:text-gym-accent transition-colors">{session.name}</h3>
                  <p className="text-xs text-gym-muted flex items-center gap-1 mt-1">
                    <Clock size={12} /> {new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    <span className="mx-1">•</span> 
                    <span className="text-gym-text font-bold bg-gym-700 px-1.5 rounded">{session.duration ? formatTime(session.duration) : 'N/A'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-gym-success/20 text-gym-success text-xs font-bold px-2 py-1 rounded">
                    Done
                    </div>
                    <ChevronRight size={18} className="text-gym-muted group-hover:text-gym-accent" />
                </div>
              </div>
              
              <div className="space-y-1 w-full">
                {session.exercises.slice(0, 3).map((ex, i) => {
                   const maxWeight = Math.max(...ex.sets.map(s => s.completed ? s.weight : 0));
                   const completedSets = ex.sets.filter(s => s.completed).length;
                   const name = EXERCISES[ex.exerciseId]?.name || 'Unknown';

                   // Only show exercises actually performed
                   if (maxWeight === 0 && completedSets === 0) return null;

                   return (
                     <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-gym-text truncate max-w-[60%]">{name}</span>
                        <div className="flex gap-3 text-xs text-gym-muted font-mono">
                           <span>{completedSets} sets</span>
                           <span className="text-gym-accent">{maxWeight}kg</span>
                        </div>
                     </div>
                   )
                })}
                {session.exercises.length > 3 && (
                    <div className="text-xs text-gym-muted italic pt-1 text-center">
                        + {session.exercises.length - 3} more exercises
                    </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Detailed Session Modal */}
      {detailedSession && (
        <div className="fixed inset-0 bg-gym-900 z-[60] flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
             {/* Header */}
             <div className="bg-gym-800 p-4 pt-10 flex justify-between items-start border-b border-gym-700 shadow-sm">
                 <div>
                    <h2 className="text-xl font-bold text-gym-text leading-tight">{detailedSession.name}</h2>
                    <p className="text-sm text-gym-muted mt-1 flex items-center gap-2">
                       <Calendar size={14}/> {new Date(detailedSession.date).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                    </p>
                    <p className="text-sm text-gym-muted mt-0.5 flex items-center gap-2">
                        <Clock size={14} /> Duration: {detailedSession.duration ? formatTime(detailedSession.duration) : 'N/A'}
                    </p>
                 </div>
                 <button 
                    onClick={() => setDetailedSession(null)} 
                    className="p-2 bg-gym-700 rounded-full text-gym-text hover:bg-gym-600 transition-colors"
                 >
                    <X size={20} />
                 </button>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {detailedSession.exercises.sort((a,b) => a.order - b.order).map((exLog, index) => {
                    const exerciseDef = EXERCISES[exLog.exerciseId];
                    if (!exerciseDef) return null;

                    return (
                        <div key={`${exLog.exerciseId}-${index}`} className="bg-gym-800 rounded-xl border border-gym-700 overflow-hidden">
                            <div className="p-3 bg-gym-700/30 border-b border-gym-700 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold bg-gym-accent text-white px-1.5 py-0.5 rounded">#{exLog.order + 1}</span>
                                    <div>
                                        <h4 className="font-bold text-gym-text">{exerciseDef.name}</h4>
                                        <span className="text-[10px] text-gym-muted uppercase tracking-wider">{exerciseDef.muscleGroup}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-2">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gym-muted text-[10px] uppercase font-bold border-b border-gym-700/50">
                                            <th className="py-2 text-left pl-2">Set</th>
                                            <th className="py-2 text-center">Weight</th>
                                            <th className="py-2 text-center">Reps</th>
                                            <th className="py-2 text-right pr-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {exLog.sets.map((set, setIndex) => (
                                            <tr key={setIndex} className="border-b border-gym-700/30 last:border-0 hover:bg-gym-700/20">
                                                <td className="py-2 pl-2 text-gym-muted font-mono">{setIndex + 1}</td>
                                                <td className="py-2 text-center font-bold text-gym-text">{set.weight} <span className="text-[10px] font-normal text-gym-muted">kg</span></td>
                                                <td className="py-2 text-center text-gym-text">{set.repsCompleted}</td>
                                                <td className="py-2 pr-2 text-right">
                                                    {set.completed ? (
                                                        set.repsCompleted >= exLog.targetReps ? (
                                                            <span className="text-gym-success flex items-center justify-end gap-1 text-xs font-bold"><Check size={14}/> Full</span>
                                                        ) : (
                                                            <span className="text-gym-warning flex items-center justify-end gap-1 text-xs font-bold"><Check size={14}/> Partial</span>
                                                        )
                                                    ) : (
                                                        <span className="text-gym-muted flex items-center justify-end gap-1 text-xs"><XCircle size={14}/> Skip</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
             </div>
        </div>
      )}
    </div>
  );
};