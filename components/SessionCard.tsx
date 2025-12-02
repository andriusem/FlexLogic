
import React, { useState } from 'react';
import { WorkoutSession, SessionTemplate } from '../types';
import { Play, Edit, Trash2 } from 'lucide-react';

interface Props {
  title: string;
  subtitle: string;
  onStart: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isTemplate?: boolean;
}

export const SessionCard: React.FC<Props> = ({ title, subtitle, onStart, onEdit, onDelete, isTemplate }) => {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div 
      onClick={() => setShowOptions(!showOptions)}
      className={`bg-gym-800 p-4 rounded-xl border transition-all duration-200 shadow-sm flex justify-between items-center mb-3 cursor-pointer select-none ${showOptions ? 'border-gym-accent bg-gym-800/80' : 'border-gym-700 hover:border-gym-600'}`}
    >
      <div className="flex-1 min-w-0 pr-2">
        <h3 className={`font-bold text-lg truncate transition-colors ${showOptions ? 'text-gym-accent' : 'text-gym-text'}`}>{title}</h3>
        <p className="text-gym-muted text-sm truncate">{subtitle}</p>
      </div>
      
      <div className="flex gap-2 items-center">
        {/* Admin Controls - Hidden by default, reveal on click */}
        {showOptions && (
          <div className="flex gap-2 animate-in fade-in slide-in-from-right-4 duration-200 mr-1 relative z-20">
            {onEdit && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                  className="p-3 bg-gym-700 rounded-full text-gym-text hover:bg-gym-600 transition-colors shadow-sm"
                  aria-label="Edit Routine"
                >
                  <Edit size={18} />
                </button>
            )}
            {onDelete && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                  className="p-3 bg-gym-700 rounded-full text-gym-muted hover:text-red-500 hover:bg-gym-600 transition-colors shadow-sm"
                  aria-label="Delete Routine"
                >
                  <Trash2 size={18} />
                </button>
            )}
          </div>
        )}

        {/* Start Button - Always Visible */}
        <button 
          onClick={(e) => { e.stopPropagation(); onStart(); }} 
          className={`p-3 rounded-full text-white transition-all shadow-lg shadow-orange-500/20 flex-shrink-0 relative z-20 ${showOptions ? 'bg-gym-secondary scale-110' : 'bg-gym-accent hover:bg-gym-secondary'}`}
          aria-label="Start Workout"
        >
          <Play size={20} fill="currentColor" />
        </button>
      </div>
    </div>
  );
};
