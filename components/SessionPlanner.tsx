
import React, { useState, useEffect } from 'react';
import { SessionTemplate } from '../types';
import { EXERCISES } from '../constants';
import { Save, Plus, X, GripVertical, Trash2 } from 'lucide-react';
import { saveTemplate } from '../services/storageService';

interface Props {
  onClose: () => void;
  initialTemplate?: SessionTemplate | null;
}

interface PlannerItem {
  uid: string;
  exerciseId: string;
}

export const SessionPlanner: React.FC<Props> = ({ onClose, initialTemplate }) => {
  const [sessionName, setSessionName] = useState('');
  // Use local object state to allow unique keys for DnD even with duplicate exercises
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialTemplate) {
      setSessionName(initialTemplate.name);
      setItems(initialTemplate.exerciseIds.map(id => ({
        uid: Math.random().toString(36).substr(2, 9),
        exerciseId: id
      })));
    }
  }, [initialTemplate]);

  const handleSave = () => {
    if (!sessionName || items.length === 0) return;
    
    const newTemplate: SessionTemplate = {
      id: initialTemplate ? initialTemplate.id : `tpl-${Date.now()}`,
      name: sessionName,
      exerciseIds: items.map(i => i.exerciseId),
      defaultSets: 4,
      defaultReps: 12
    };
    saveTemplate(newTemplate);
    onClose();
  };

  const removeExercise = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const addExercise = (id: string) => {
    setItems(prev => [...prev, { uid: Math.random().toString(36).substr(2, 9), exerciseId: id }]);
    setIsSelectorOpen(false);
  };

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox to allow drag
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggingIndex];
    
    // Remove from old index
    newItems.splice(draggingIndex, 1);
    // Insert at new index
    newItems.splice(index, 0, draggedItem);
    
    setItems(newItems);
    setDraggingIndex(index);
  };

  const onDragEnd = () => {
    setDraggingIndex(null);
  };

  return (
    <div className="fixed inset-0 bg-gym-900 z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="bg-gym-800 p-4 pt-10 flex justify-between items-center shadow-sm border-b border-gym-700">
        <h2 className="text-xl font-bold text-gym-text">{initialTemplate ? 'Edit Routine' : 'Create Routine'}</h2>
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

        <label className="text-xs text-gym-muted uppercase font-bold tracking-wider mb-2 block">Exercises ({items.length})</label>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
            {items.length === 0 && (
            <div className="text-center text-gym-muted py-10 border-2 border-dashed border-gym-700 rounded-xl">
                Add exercises to start building your routine
            </div>
            )}
            {items.map((item, index) => (
            <div 
                key={item.uid} 
                draggable
                onDragStart={(e) => onDragStart(e, index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDragEnd={onDragEnd}
                className={`
                    bg-gym-800 p-3 rounded-lg flex items-center justify-between border border-gym-700 group
                    ${draggingIndex === index ? 'opacity-40 border-dashed border-gym-accent scale-[0.98]' : 'hover:border-gym-accent'}
                    transition-all cursor-move
                `}
            >
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    {/* Drag Handle */}
                    <div className="text-gym-muted group-hover:text-gym-accent cursor-grab active:cursor-grabbing">
                        <GripVertical size={24} />
                    </div>
                    
                    <div className="truncate">
                        <span className="text-gym-text font-bold block truncate">{EXERCISES[item.exerciseId]?.name || 'Unknown'}</span>
                        <span className="text-xs text-gym-muted">{EXERCISES[item.exerciseId]?.equipment}</span>
                    </div>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); removeExercise(index); }} 
                    className="p-2 text-gym-700 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
                >
                    <Trash2 size={20}/>
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
            disabled={!sessionName || items.length === 0}
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
                onClick={() => addExercise(ex.id)}
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
