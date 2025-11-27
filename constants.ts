import { Exercise, MuscleGroup, Equipment, SessionTemplate } from './types';

export const EXERCISES: Record<string, Exercise> = {
  'sq-bb': { id: 'sq-bb', name: 'Barbell Squat', muscleGroup: MuscleGroup.LEGS, equipment: Equipment.BARBELL, isCompound: true, defaultAlternatives: ['sq-hack', 'lp-mac'] },
  'sq-hack': { id: 'sq-hack', name: 'Hack Squat', muscleGroup: MuscleGroup.LEGS, equipment: Equipment.MACHINE, isCompound: true, defaultAlternatives: ['sq-bb', 'lp-mac'] },
  'lp-mac': { id: 'lp-mac', name: 'Leg Press', muscleGroup: MuscleGroup.LEGS, equipment: Equipment.MACHINE, isCompound: true, defaultAlternatives: ['sq-hack', 'sq-bb'] },
  'le-mac': { id: 'le-mac', name: 'Leg Extension', muscleGroup: MuscleGroup.LEGS, equipment: Equipment.MACHINE, isCompound: false, defaultAlternatives: [] },
  'lc-mac': { id: 'lc-mac', name: 'Leg Curl', muscleGroup: MuscleGroup.LEGS, equipment: Equipment.MACHINE, isCompound: false, defaultAlternatives: [] },
  
  'bp-bb': { id: 'bp-bb', name: 'Bench Press', muscleGroup: MuscleGroup.CHEST, equipment: Equipment.BARBELL, isCompound: true, defaultAlternatives: ['bp-db', 'cp-mac'] },
  'bp-db': { id: 'bp-db', name: 'Dumbbell Press', muscleGroup: MuscleGroup.CHEST, equipment: Equipment.DUMBBELL, isCompound: true, defaultAlternatives: ['bp-bb', 'cp-mac'] },
  'cp-mac': { id: 'cp-mac', name: 'Chest Press Machine', muscleGroup: MuscleGroup.CHEST, equipment: Equipment.MACHINE, isCompound: true, defaultAlternatives: ['bp-bb', 'bp-db'] },
  'fly-cab': { id: 'fly-cab', name: 'Cable Fly', muscleGroup: MuscleGroup.CHEST, equipment: Equipment.CABLE, isCompound: false, defaultAlternatives: ['fly-db'] },
  'fly-db': { id: 'fly-db', name: 'Dumbbell Fly', muscleGroup: MuscleGroup.CHEST, equipment: Equipment.DUMBBELL, isCompound: false, defaultAlternatives: ['fly-cab'] },

  'lat-pd': { id: 'lat-pd', name: 'Lat Pulldown', muscleGroup: MuscleGroup.BACK, equipment: Equipment.CABLE, isCompound: true, defaultAlternatives: ['pu-bw', 'row-mac'] },
  'row-mac': { id: 'row-mac', name: 'Seated Row Machine', muscleGroup: MuscleGroup.BACK, equipment: Equipment.MACHINE, isCompound: true, defaultAlternatives: ['lat-pd', 'row-bb'] },
  'row-bb': { id: 'row-bb', name: 'Barbell Row', muscleGroup: MuscleGroup.BACK, equipment: Equipment.BARBELL, isCompound: true, defaultAlternatives: ['row-mac'] },
  'pu-bw': { id: 'pu-bw', name: 'Pull Up', muscleGroup: MuscleGroup.BACK, equipment: Equipment.BODYWEIGHT, isCompound: true, defaultAlternatives: ['lat-pd'] },
};

export const DEFAULT_TEMPLATES: SessionTemplate[] = [
  {
    id: 'tpl-legs',
    name: 'Leg Day Power',
    exerciseIds: ['sq-bb', 'lp-mac', 'le-mac', 'lc-mac'],
    defaultSets: 4,
    defaultReps: 12
  },
  {
    id: 'tpl-chest',
    name: 'Chest & Tris',
    exerciseIds: ['bp-bb', 'cp-mac', 'fly-cab'],
    defaultSets: 4,
    defaultReps: 12
  },
  {
    id: 'tpl-back',
    name: 'Back & Biceps',
    exerciseIds: ['lat-pd', 'row-mac', 'pu-bw'],
    defaultSets: 4,
    defaultReps: 12
  }
];

export const WEIGHT_INCREMENT = 2.5;
export const FATIGUE_FACTOR = 0.05; // 5% weight reduction per slot moved down for compounds
