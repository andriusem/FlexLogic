
import React, { useState, useEffect, useMemo } from 'react';
import { getSessions } from '../services/storageService';
import { WorkoutSession, ExerciseSessionLog } from '../types';
import { EXERCISES } from '../constants';
import { Calendar, Clock, ChevronRight, X, Check, XCircle, RotateCw, TrendingUp } from 'lucide-react';

// --- HELPER COMPONENTS ---

const LineChart: React.FC<{ data: any[] }> = ({ data }) => {
    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gym-muted text-sm font-bold">No history data</div>;
    if (data.length === 1) return <div className="h-full flex items-center justify-center text-gym-muted text-sm px-8 text-center">Complete more workouts to see progress trend</div>;

    const height = 180;
    const width = 350; // Use a fixed internal coordinate system, scale with SVG
    const padding = 20;
    const chartH = height - padding * 2;
    const chartW = width - padding * 2;

    const weights = data.map(d => d.weight);
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);
    
    // Dynamic Y domain
    const domainMax = maxWeight + (maxWeight * 0.1); 
    const domainMin = Math.max(0, minWeight - (minWeight * 0.1)); 
    const domainRange = domainMax - domainMin || 1;

    const getX = (i: number) => padding + (i / (data.length - 1)) * chartW;
    const getY = (w: number) => height - padding - ((w - domainMin) / domainRange) * chartH;

    const points = data.map((d: any, i: number) => `${getX(i)},${getY(d.weight)}`).join(' ');

    return (
        <div className="w-full h-full flex items-center justify-center p-2">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {/* Grid Lines */}
                {[0, 0.5, 1].map(pct => {
                    const val = domainMin + (domainRange * pct);
                    const y = getY(val);
                    return (
                        <g key={pct}>
                            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#FED7AA" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={padding - 5} y={y + 3} textAnchor="end" className="text-[9px] fill-gym-muted font-mono">{Math.round(val)}</text>
                        </g>
                    )
                })}

                {/* Main Line */}
                <polyline points={points} fill="none" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {/* Data Points */}
                {data.map((d: any, i: number) => (
                    <g key={i}>
                        <circle cx={getX(i)} cy={getY(d.weight)} r="3" fill="#FFF8ED" stroke="#F97316" strokeWidth="2" />
                        {/* Only show date for first and last to avoid clutter */}
                        {(i === 0 || i === data.length - 1) && (
                            <text x={getX(i)} y={height - 2} textAnchor="middle" className="text-[8px] fill-gym-muted font-bold uppercase">
                                {new Date(d.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
};

interface DetailedExerciseCardProps {
    exLog: ExerciseSessionLog;
    sessions: WorkoutSession[];
}

const DetailedExerciseCard: React.FC<DetailedExerciseCardProps> = ({ exLog, sessions }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const exerciseDef = EXERCISES[exLog.exerciseId];
  
  // Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe || isRightSwipe) {
      setIsFlipped(prev => !prev);
    }
  };
  
  // Calculate history for this specific exercise
  const history = useMemo(() => {
     return sessions.reduce((acc: any[], session) => {
        const log = session.exercises.find(e => e.exerciseId === exLog.exerciseId);
        if (log) {
            const maxWeight = Math.max(...log.sets.filter(s => s.completed).map(s => s.weight), 0);
            if (maxWeight > 0) {
                 acc.push({
                    date: session.date,
                    weight: maxWeight
                 });
            }
        }
        return acc;
     }, []).reverse(); // Oldest to newest
  }, [sessions, exLog.exerciseId]);

  if (!exerciseDef) return null;

  return (
    <div 
        className="perspective-1000 w-full mb-4 group touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
    > 
        <div 
            className={`w-full relative transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
            style={{ transformStyle: 'preserve-3d' }}
        >
            
            {/* FRONT FACE: Table */}
            {/* When not flipped (default), this is 'relative' and determines height. When flipped, it becomes 'absolute' and hidden. */}
            <div 
                 className={`backface-hidden bg-gym-800 rounded-xl border border-gym-700 overflow-hidden flex flex-col shadow-sm z-10 w-full ${isFlipped ? 'absolute inset-0 h-full' : 'relative'}`}
                 style={{ 
                     backfaceVisibility: 'hidden', 
                     WebkitBackfaceVisibility: 'hidden',
                     // When flipped, hide content to prevent interaction/layout issues
                     visibility: isFlipped ? 'hidden' : 'visible',
                     transition: 'visibility 0s linear 0.3s' // Delay hiding until halfway through flip
                 }}
            >
                 <div className="p-3 bg-gym-700/30 border-b border-gym-700 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-xs font-bold bg-gym-accent text-white px-1.5 py-0.5 rounded shrink-0">#{exLog.order + 1}</span>
                        <div className="truncate">
                            <h4 className="font-bold text-gym-text truncate">{exerciseDef.name}</h4>
                            <span className="text-[10px] text-gym-muted uppercase tracking-wider">{exerciseDef.muscleGroup}</span>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                        className="p-1.5 bg-white/50 hover:bg-white text-gym-accent rounded-lg transition-colors ml-2 shrink-0"
                        title="View Progress Chart"
                    >
                        <TrendingUp size={16} />
                    </button>
                 </div>
                 
                 <div className="p-2 overflow-y-auto">
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

            {/* BACK FACE: Chart */}
            {/* When flipped, this is 'relative' and determines height (min 260px). When not flipped, it is 'absolute' and hidden. */}
            <div 
                 className={`backface-hidden rotate-y-180 bg-gym-800 rounded-xl border border-gym-700 overflow-hidden flex flex-col shadow-sm w-full ${isFlipped ? 'relative min-h-[260px]' : 'absolute inset-0 h-full'}`}
                 style={{ 
                     backfaceVisibility: 'hidden', 
                     WebkitBackfaceVisibility: 'hidden', 
                     transform: 'rotateY(180deg)',
                     visibility: isFlipped ? 'visible' : 'hidden',
                     transition: 'visibility 0s linear 0.3s'
                 }}
            >
                 <div className="p-3 bg-gym-700/30 border-b border-gym-700 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                         <span className="font-bold text-gym-muted text-xs uppercase tracking-wider">Weight History</span>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                        className="p-1.5 bg-white/50 hover:bg-white text-gym-accent rounded-lg transition-colors"
                        title="Back to Table"
                    >
                        <RotateCw size={16} />
                    </button>
                 </div>

                 <div className="flex-1 w-full relative p-2 min-h-[200px]">
                    <LineChart data={history} />
                 </div>
            </div>
        </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

export const ProgressView: React.FC = () => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [detailedSession, setDetailedSession] = useState<WorkoutSession | null>(null);

  useEffect(() => {
    // Get completed sessions sorted by date descending
    const allSessions = getSessions().filter(s => s.completed).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setSessions(allSessions);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="min-h-screen bg-gym-900 text-gym-text pb-24 p-6 pt-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gym-secondary">Progress</h1>
        <p className="text-gym-muted">Track your lifts & time</p>
      </header>

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
             <div className="bg-gym-800 p-4 pt-10 flex justify-between items-start border-b border-gym-700 shadow-sm shrink-0">
                 <div>
                    <h2 className="text-xl font-bold text-gym-text leading-tight">{detailedSession.name}</h2>
                    <p className="text-sm text-gym-muted mt-1 flex items-center gap-2">
                       <Calendar size={14}/> {new Date(detailedSession.date).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
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
             <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {detailedSession.exercises.sort((a,b) => a.order - b.order).map((exLog, index) => (
                    <DetailedExerciseCard 
                        key={`${exLog.exerciseId}-${index}`} 
                        exLog={exLog} 
                        sessions={sessions} 
                    />
                ))}
             </div>
        </div>
      )}
    </div>
  );
};
