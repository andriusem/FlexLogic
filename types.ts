
export enum MuscleGroup {
  LEGS = 'Legs',
  CHEST = 'Chest',
  BACK = 'Back',
  SHOULDERS = 'Shoulders',
  ARMS = 'Arms',
  CORE = 'Core',
  HIIT = 'HIIT'
}

export enum Equipment {
  BARBELL = 'Barbell',
  DUMBBELL = 'Dumbbell',
  CABLE = 'Cable Machine',
  MACHINE = 'Machine',
  BODYWEIGHT = 'Bodyweight',
  SMITH = 'Smith Machine',
  KETTLEBELL = 'Kettlebell'
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isCompound: boolean;
  defaultAlternatives: string[]; // IDs of alternative exercises
}

export interface SetLog {
  repsCompleted: number;
  weight: number;
  completed: boolean;
}

export interface ExerciseSessionLog {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  sets: SetLog[];
  order: number; // The position in the workout (0, 1, 2...)
  baseWeight: number; // The "fresh" weight capability before fatigue adjustment
}

export interface WorkoutSession {
  id: string;
  name: string;
  date: string; // ISO date string
  completed: boolean;
  duration: number; // Duration in seconds
  exercises: ExerciseSessionLog[];
}

export interface SessionTemplate {
  id: string;
  name: string;
  exerciseIds: string[];
  defaultSets: number;
  defaultReps: number;
}

export interface ScheduledSession {
  date: string; // YYYY-MM-DD
  templateId: string;
}
