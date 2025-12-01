import React, { useState } from 'react';
import { SessionTemplate, Exercise } from '../types';
import { EXERCISES } from '../constants';
import { Save, Plus, X, GripVertical, Trash2 } from 'lucide-react';
import { saveTemplate } from '../services/storageService';

interface Props {
  onClose: () => void;
}

export const SessionPlanner: React.FC<Props> = ({ onClose }) => {
  const [sessionName, setSessionName] = useState('');
  const [selectedExIds, setSelectedExIds] = useState<string[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const handleSave = () => {
    if (!sessionName || selectedExIds.length === 0) return;
    const newTemplate: SessionTemplate = {
      id: `tpl-${Date.now()}`,
      name: sessionName,
      exerciseIds: selectedExIds,
      defaultSets: 4,
      defaultReps: 12
    };
    saveTemplate(newTemplate);
    onClose();
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    const newIds = [...selectedExIds];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newIds.length) return;
    
    [newIds[index], newIds[targetIndex]] = [newIds[targetIndex], newIds[index]];
    setSelectedExIds(newIds);
  };

  const removeExercise = (index: number) => {
    setSelectedExIds(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-gym-900 z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="bg-gym-800 p-4 pt-10 flex justify-between items-center shadow-sm border-b border-gym-700">
        <h2 className="text-xl font-bold text-gym-text">Create Routine</h2>
        <button onClick={onClose}><X className="text-gym-muted hover:text-gym-accent" /></button>
      </div>

      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        <div className="mb-4">
            <label className="text-xs text-gym-muted uppercase font-bold tracking-wider mb-1 block">Routine Name</label>
            <input
                type="text"
                placeholder="e.g. Leg Day Destruction"
                className="bg-white text-gym-text p-4 rounded-xl border border-gym-700 w-full focus:border-gym-accent outline-none text-lg font-bold placeholder-gym-700"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
            />
        </div>

        <label className="text-xs text-gym-muted uppercase font-bold tracking-wider mb-2 block">Exercises ({selectedExIds.length})</label>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
            {selectedExIds.length === 0 && (
            <div className="text-center text-gym-muted py-10 border-2 border-dashed border-gym-700 rounded-xl">
                Add exercises to start building your routine
            </div>
            )}
            {selectedExIds.map((id, index) => (
            <div key={`${id}-${index}`} className="bg-gym-800 p-3 rounded-lg flex items-center justify-between border border-gym-700 group">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                        <button onClick={() => moveExercise(index, -1)} disabled={index === 0} className="text-gym-muted hover:text-gym-accent disabled:opacity-20"><div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-current"></div></button>
                        <button onClick={() => moveExercise(index, 1)} disabled={index === selectedExIds.length -1} className="text-gym-muted hover:text-gym-accent disabled:opacity-20"><div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-current"></div></button>
                    </div>
                    <div>
                        <span className="text-gym-text font-bold block">{EXERCISES[id]?.name || 'Unknown'}</span>
                        <span className="text-xs text-gym-muted">{EXERCISES[id]?.equipment}</span>
                    </div>
                </div>
                <button onClick={() => removeExercise(index)} className="p-2 text-gym-700 hover:text-red-500 transition-colors">
                    <Trash2 size={18}/>
                </button>
            </div>
            ))}
        </div>

        <div className="mt-4 grid grid-cols-5 gap-3 pt-4 border-t border-gym-700">
            <button 
            onClick={() => setIsSelectorOpen(true)}
            className="col-span-4 bg-gym-700 text-gym-text py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gym-600 active:scale-95 transition-all"
            >
            <Plus size={20} /> Add Exercise
            </button>
            <button 
            onClick={handleSave}
            disabled={!sessionName || selectedExIds.length === 0}
            className="col-span-1 bg-gym-accent text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:grayscale active:scale-95 transition-all shadow-lg shadow-orange-500/20"
            >
            <Save size={24} />
            </button>
        </div>
      </div>

      {isSelectorOpen && (
        <div className="fixed inset-0 bg-gym-900 z-[60] flex flex-col animate-in fade-in duration-200">
          <div className="bg-gym-800 p-4 pt-10 flex justify-between items-center shadow-sm border-b border-gym-700">
             <h3 className="text-gym-text font-bold">Select Exercise</h3>
             <button onClick={() => setIsSelectorOpen(false)}><X className="text-gym-muted hover:text-gym-accent" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {Object.values(EXERCISES).map(ex => (
              <button
                key={ex.id}
                onClick={() => {
                  setSelectedExIds([...selectedExIds, ex.id]);
                  setIsSelectorOpen(false);
                }}
                className="w-full text-left p-4 border-b border-gym-700 hover:bg-gym-800 active:bg-gym-700 transition-colors flex justify-between items-center"
              >
                <div>
                    <div className="font-bold text-gym-text">{ex.name}</div>
                    <div className="text-xs text-gym-muted mt-0.5">{ex.muscleGroup} • {ex.equipment}</div>
                </div>
                <Plus size={16} className="text-gym-accent"/>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};