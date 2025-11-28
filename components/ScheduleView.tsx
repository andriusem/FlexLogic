
import React, { useState, useEffect } from 'react';
import { Calendar, ChevronRight, Plus, Trash2, X, Dumbbell } from 'lucide-react';
import { SessionTemplate, ScheduledSession } from '../types';
import { getTemplates, getScheduledSessions, saveScheduledSession, removeScheduledSession } from '../services/storageService';

interface Props {
  // 
}

export const ScheduleView: React.FC<Props> = () => {
  const [schedule, setSchedule] = useState<ScheduledSession[]>([]);
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = () => {
    setSchedule(getScheduledSessions());
    setTemplates(getTemplates());
  };

  const generateDays = () => {
    const days = [];
    const today = new Date();
    
    // Generate next 14 days
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push({
        dateObj: d,
        dateStr: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
        dayShort: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
      });
    }
    return days;
  };

  const handleAssignTemplate = (templateId: string) => {
    if (!selectedDate) return;
    saveScheduledSession({ date: selectedDate, templateId });
    setSelectedDate(null);
    refresh();
  };

  const handleRemove = (date: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeScheduledSession(date);
    refresh();
  };

  const days = generateDays();

  return (
    <div className="min-h-screen bg-gym-900 text-white pb-24 p-6 pt-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-gym-accent">Schedule</h1>
        <p className="text-gray-400">Plan your upcoming workouts</p>
      </header>

      <div className="space-y-4">
        {days.map((day, i) => {
          const scheduled = schedule.find(s => s.date === day.dateStr);
          const template = scheduled ? templates.find(t => t.id === scheduled.templateId) : null;
          const isToday = i === 0;

          return (
            <div key={day.dateStr} className="relative">
                {/* Date Header for grouping if needed, keeping it simple for now */}
                
                <div 
                  className={`
                    rounded-xl p-4 border transition-all cursor-pointer
                    ${scheduled 
                        ? 'bg-gym-800 border-gym-700 hover:border-gym-accent' 
                        : 'bg-gym-800/30 border-gym-800 border-dashed hover:bg-gym-800 hover:border-gym-600'
                    }
                    ${isToday ? 'ring-1 ring-gym-accent ring-offset-2 ring-offset-gym-900' : ''}
                  `}
                  onClick={() => !scheduled && setSelectedDate(day.dateStr)}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${isToday ? 'bg-gym-accent text-white' : 'bg-gym-900 text-gray-400'}`}>
                                <span className="text-[10px] uppercase font-bold">{day.dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                <span className="text-lg font-bold leading-none">{day.dateObj.getDate()}</span>
                            </div>
                            
                            <div>
                                {scheduled && template ? (
                                    <>
                                        <h3 className="font-bold text-white text-lg">{template.name}</h3>
                                        <p className="text-xs text-gray-400">{template.exerciseIds.length} Exercises</p>
                                    </>
                                ) : (
                                    <span className="text-gray-500 font-medium">Rest Day</span>
                                )}
                            </div>
                        </div>

                        {scheduled ? (
                            <button 
                                onClick={(e) => handleRemove(day.dateStr, e)}
                                className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        ) : (
                            <button className="p-2 bg-gym-800 rounded-full text-gym-accent hover:bg-gym-accent hover:text-white transition-all">
                                <Plus size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
          );
        })}
      </div>

      {/* Template Selector Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-gym-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-gym-800 w-full max-w-md rounded-2xl border border-gym-700 shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gym-700 flex justify-between items-center">
                    <h3 className="font-bold text-white">Select Routine</h3>
                    <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-white"><X /></button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {templates.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No templates found. Create one in the Gym tab first.</div>
                    ) : (
                        templates.map(tpl => (
                            <button
                                key={tpl.id}
                                onClick={() => handleAssignTemplate(tpl.id)}
                                className="w-full text-left p-4 hover:bg-gym-700 rounded-xl transition-colors border-b border-gym-700/50 last:border-0 group"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="font-bold text-white block group-hover:text-gym-accent transition-colors">{tpl.name}</span>
                                        <span className="text-xs text-gray-500">{tpl.exerciseIds.length} Exercises</span>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-600 group-hover:text-white" />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
