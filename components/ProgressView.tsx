
import React, { useState, useEffect } from 'react';
import { getSessions } from '../services/storageService';
import { WorkoutSession } from '../types';
import { EXERCISES } from '../constants';
import { Calendar, Clock, ChevronDown, TrendingUp } from 'lucide-react';

export const ProgressView: React.FC = () => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | 'all'>('all');
  const [exerciseHistory, setExerciseHistory] = useState<any[]>([]);

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
    <div className="min-h-screen bg-gym-900 text-white pb-24 p-6 pt-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-gym-accent">Progress</h1>
        <p className="text-gray-400">Track your lifts & time</p>
      </header>

      {/* Exercise Performance Selector */}
      <section className="mb-8">
        <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <TrendingUp size={20} className="text-gym-accent" /> Exercise Weight
        </h2>
        <div className="relative mb-4">
            <select 
                className="w-full appearance-none bg-gym-800 text-white p-4 rounded-xl border border-gym-700 focus:border-gym-accent outline-none font-bold"
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
            >
                <option value="all">Select an exercise to see progress...</option>
                {getUniqueExercises().map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
        </div>

        {selectedExerciseId !== 'all' && (
            <div className="bg-gym-800 rounded-xl overflow-hidden border border-gym-700">
                {exerciseHistory.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No data found for this exercise.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gym-900/50 text-gray-400 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-3 text-left">Date</th>
                                <th className="p-3 text-right">Weight</th>
                                <th className="p-3 text-right">Reps</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gym-700">
                            {exerciseHistory.map((h, i) => (
                                <tr key={i} className="hover:bg-gym-700/50">
                                    <td className="p-3 text-gray-300">
                                        {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </td>
                                    <td className="p-3 text-right font-bold text-white">{h.weight} kg</td>
                                    <td className="p-3 text-right text-gray-400">{h.sets} x {h.reps}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        )}
      </section>

      {/* History List */}
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Calendar size={20} className="text-gray-400" /> Workout History
      </h2>

      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-gym-800/50 rounded-xl border border-dashed border-gym-700">
            No workouts completed yet. Start training!
          </div>
        ) : (
          sessions.map(session => (
            <div key={session.id} className="bg-gym-800 rounded-xl p-4 border border-gym-700 flex flex-col gap-3">
              <div className="flex justify-between items-start border-b border-gym-700 pb-3">
                <div>
                  <h3 className="font-bold text-white text-lg">{session.name}</h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock size={12} /> {new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    <span className="mx-1">•</span> 
                    <span className="text-white font-bold bg-gym-700 px-1.5 rounded">{session.duration ? formatTime(session.duration) : 'N/A'}</span>
                  </p>
                </div>
                <div className="bg-gym-success/20 text-gym-success text-xs font-bold px-2 py-1 rounded">
                   Done
                </div>
              </div>
              
              <div className="space-y-1">
                {session.exercises.map((ex, i) => {
                   const maxWeight = Math.max(...ex.sets.map(s => s.completed ? s.weight : 0));
                   const completedSets = ex.sets.filter(s => s.completed).length;
                   const name = EXERCISES[ex.exerciseId]?.name || 'Unknown';

                   // Only show exercises actually performed
                   if (maxWeight === 0) return null;

                   return (
                     <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-gray-300">{name}</span>
                        <div className="flex gap-3 text-xs text-gray-500 font-mono">
                           <span>{completedSets} sets</span>
                           <span className="text-gym-accent">{maxWeight}kg</span>
                        </div>
                     </div>
                   )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
