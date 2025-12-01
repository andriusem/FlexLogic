import React from 'react';
import { WorkoutSession, SessionTemplate } from '../types';
import { Play, Edit } from 'lucide-react';

interface Props {
  title: string;
  subtitle: string;
  onStart: () => void;
  onEdit?: () => void;
  isTemplate?: boolean;
}

export const SessionCard: React.FC<Props> = ({ title, subtitle, onStart, onEdit, isTemplate }) => {
  return (
    <div className="bg-gym-800 p-4 rounded-xl border border-gym-700 shadow-sm flex justify-between items-center mb-3">
      <div>
        <h3 className="text-gym-text font-bold text-lg">{title}</h3>
        <p className="text-gym-muted text-sm">{subtitle}</p>
      </div>
      <div className="flex gap-2">
        {onEdit && (
            <button onClick={onEdit} className="p-3 bg-gym-700 rounded-full text-gym-text hover:bg-gym-600 transition-colors">
              <Edit size={20} />
            </button>
        )}
        <button 
          onClick={onStart} 
          className="p-3 bg-gym-accent rounded-full text-white hover:bg-gym-secondary transition-colors shadow-lg shadow-orange-500/20"
        >
          <Play size={20} fill="currentColor" />
        </button>
      </div>
    </div>
  );
};