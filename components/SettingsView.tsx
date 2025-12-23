
import React, { useState } from 'react';
import { AppSettings, Exercise } from '../types';
import { getSettings, saveSettings, getCustomExercises, deleteCustomExercise, getSessions } from '../services/storageService';
import { X, Trash2, Download, Sun, Moon, Plus, Minus } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  customExercises: Exercise[];
  onCustomExercisesChange: () => void;
}

export const SettingsView: React.FC<Props> = ({ 
  onClose, 
  onSettingsChange,
  customExercises,
  onCustomExercisesChange
}) => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = saveSettings({ [key]: value });
    setSettings(updated);
    onSettingsChange(updated);
  };

  const handleDeleteCustomExercise = (id: string) => {
    deleteCustomExercise(id);
    onCustomExercisesChange();
    setShowDeleteConfirm(null);
  };

  const exportWorkoutHistory = () => {
    const sessions = getSessions();
    const completedSessions = sessions.filter(s => s.completed);
    
    const dataStr = JSON.stringify(completedSessions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `flexlogic-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const sessions = getSessions().filter(s => s.completed);
    
    let csv = 'Date,Session Name,Exercise,Sets Completed,Target Reps,Weight (kg)\n';
    
    sessions.forEach(session => {
      session.exercises.forEach(ex => {
        const completedSets = ex.sets.filter(s => s.completed).length;
        const avgWeight = ex.sets.length > 0 
          ? (ex.sets.reduce((sum, s) => sum + s.weight, 0) / ex.sets.length).toFixed(1)
          : '0';
        csv += `${session.date.split('T')[0]},${session.name},${ex.exerciseId},${completedSets},${ex.targetReps},${avgWeight}\n`;
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `flexlogic-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-gym-900 z-[100] flex flex-col animate-in fade-in duration-200">
      <div className="bg-gym-800 p-4 pt-10 flex justify-between items-center shadow-sm border-b border-gym-700">
        <h2 className="text-xl font-bold text-gym-text">Settings</h2>
        <button 
          onClick={onClose} 
          className="p-2 bg-gym-700 rounded-full text-gym-text hover:bg-gym-600"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Theme */}
        <section className="bg-gym-800 rounded-xl p-4 border border-gym-700">
          <h3 className="text-gym-accent font-bold text-sm uppercase tracking-wider mb-4">Appearance</h3>
          <div className="flex items-center justify-between">
            <span className="text-gym-text">Theme</span>
            <div className="flex gap-2">
              <button
                onClick={() => updateSetting('theme', 'dark')}
                className={`p-3 rounded-lg flex items-center gap-2 ${
                  settings.theme === 'dark' 
                    ? 'bg-gym-accent text-white' 
                    : 'bg-gym-700 text-gym-muted hover:bg-gym-600'
                }`}
              >
                <Moon size={18} />
                <span className="text-sm font-medium">Dark</span>
              </button>
              <button
                onClick={() => updateSetting('theme', 'light')}
                className={`p-3 rounded-lg flex items-center gap-2 ${
                  settings.theme === 'light' 
                    ? 'bg-gym-accent text-white' 
                    : 'bg-gym-700 text-gym-muted hover:bg-gym-600'
                }`}
              >
                <Sun size={18} />
                <span className="text-sm font-medium">Light</span>
              </button>
            </div>
          </div>
        </section>

        {/* Workout Defaults */}
        <section className="bg-gym-800 rounded-xl p-4 border border-gym-700">
          <h3 className="text-gym-accent font-bold text-sm uppercase tracking-wider mb-4">Workout Defaults</h3>
          
          {/* Default Sets */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-gym-text">Default Sets</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateSetting('defaultSets', Math.max(1, settings.defaultSets - 1))}
                className="p-2 bg-gym-700 rounded-lg text-gym-muted hover:text-gym-accent"
              >
                <Minus size={18} />
              </button>
              <span className="text-xl font-bold text-gym-text w-8 text-center">{settings.defaultSets}</span>
              <button
                onClick={() => updateSetting('defaultSets', Math.min(10, settings.defaultSets + 1))}
                className="p-2 bg-gym-700 rounded-lg text-gym-accent hover:text-gym-secondary"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Default Reps */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-gym-text">Default Reps</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateSetting('defaultReps', Math.max(1, settings.defaultReps - 1))}
                className="p-2 bg-gym-700 rounded-lg text-gym-muted hover:text-gym-accent"
              >
                <Minus size={18} />
              </button>
              <span className="text-xl font-bold text-gym-text w-8 text-center">{settings.defaultReps}</span>
              <button
                onClick={() => updateSetting('defaultReps', Math.min(30, settings.defaultReps + 1))}
                className="p-2 bg-gym-700 rounded-lg text-gym-accent hover:text-gym-secondary"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Weight Increment */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-gym-text">Weight Increment</span>
              <p className="text-xs text-gym-muted">For barbell, cable, machine</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateSetting('weightIncrement', Math.max(0.5, settings.weightIncrement - 0.5))}
                className="p-2 bg-gym-700 rounded-lg text-gym-muted hover:text-gym-accent"
              >
                <Minus size={18} />
              </button>
              <span className="text-xl font-bold text-gym-text w-12 text-center">{settings.weightIncrement}kg</span>
              <button
                onClick={() => updateSetting('weightIncrement', Math.min(10, settings.weightIncrement + 0.5))}
                className="p-2 bg-gym-700 rounded-lg text-gym-accent hover:text-gym-secondary"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Dumbbell Weight Increment */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-gym-text">Dumbbell Increment</span>
              <p className="text-xs text-gym-muted">For dumbbell exercises</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateSetting('dumbbellWeightIncrement', Math.max(1, settings.dumbbellWeightIncrement - 1))}
                className="p-2 bg-gym-700 rounded-lg text-gym-muted hover:text-gym-accent"
              >
                <Minus size={18} />
              </button>
              <span className="text-xl font-bold text-gym-text w-12 text-center">{settings.dumbbellWeightIncrement}kg</span>
              <button
                onClick={() => updateSetting('dumbbellWeightIncrement', Math.min(10, settings.dumbbellWeightIncrement + 1))}
                className="p-2 bg-gym-700 rounded-lg text-gym-accent hover:text-gym-secondary"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* Custom Exercises */}
        <section className="bg-gym-800 rounded-xl p-4 border border-gym-700">
          <h3 className="text-gym-accent font-bold text-sm uppercase tracking-wider mb-4">
            Custom Exercises ({customExercises.length})
          </h3>
          
          {customExercises.length === 0 ? (
            <p className="text-gym-muted text-sm">No custom exercises yet. Add them from the workout screen.</p>
          ) : (
            <div className="space-y-2">
              {customExercises.map(ex => (
                <div 
                  key={ex.id} 
                  className="flex items-center justify-between p-3 bg-gym-900 rounded-lg border border-gym-700"
                >
                  <div>
                    <div className="font-medium text-gym-text">{ex.name}</div>
                    <div className="text-xs text-gym-muted">{ex.muscleGroup} • {ex.equipment}</div>
                  </div>
                  {showDeleteConfirm === ex.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteCustomExercise(ex.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="px-3 py-1 bg-gym-700 text-gym-text text-sm rounded-lg hover:bg-gym-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(ex.id)}
                      className="p-2 text-gym-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Export Data */}
        <section className="bg-gym-800 rounded-xl p-4 border border-gym-700">
          <h3 className="text-gym-accent font-bold text-sm uppercase tracking-wider mb-4">Export Data</h3>
          
          <div className="flex gap-3">
            <button
              onClick={exportWorkoutHistory}
              className="flex-1 py-3 px-4 bg-gym-700 rounded-lg text-gym-text font-medium hover:bg-gym-600 flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Export JSON
            </button>
            <button
              onClick={exportAsCSV}
              className="flex-1 py-3 px-4 bg-gym-700 rounded-lg text-gym-text font-medium hover:bg-gym-600 flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </section>

        {/* App Info */}
        <section className="text-center py-4">
          <p className="text-gym-muted text-sm">FlexLogic v1.0</p>
          <p className="text-gym-muted text-xs mt-1">Your personal workout tracker</p>
        </section>
      </div>
    </div>
  );
};
