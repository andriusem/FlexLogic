
import { Exercise, MuscleGroup, Equipment, SessionTemplate } from './types';

export const EXERCISES: Record<string, Exercise> = {
  // --- CHEST (PUSH) ---
  'sm-inc-bp': { id: 'sm-inc-bp', name: 'Smith Machine Incline Bench Press (30°)', muscleGroup: MuscleGroup.CHEST, equipment: Equipment.SMITH, isCompound: true, defaultAlternatives: ['db-inc-bp', 'bb-flat-bp'] },
  'sm-flat-bp': { id: 'sm-flat-bp', name: 'Smith Machine Flat Bench Press', muscleGroup: MuscleGroup.CHEST, equipment: Equipment.SMITH, isCompound: true, defaultAlternatives: ['bb-flat-bp', 'db-inc-bp'] },
  'db-inc-bp': { id: 'db-inc-bp', name: 'Incline Dumbbell Bench Press (30°)', muscleGroup: MuscleGroup.CHEST, equipment: Equipment.DUMBBELL, isCompound: true, defaultAlternatives: ['sm-inc-bp', 'bb-flat-bp'] },
  'bb-flat-bp': { id: 'bb-flat-bp', name: 'Barbell Bench Press', muscleGroup: MuscleGroup.CHEST, equipment: Equipment.BARBELL, isCompound: true, defaultAlternatives: ['sm-flat-bp', 'db-inc-bp'] },
  'db-fly-flat': { id: 'db-fly-flat', name: 'Flat Dumbbell Flyes', muscleGroup: MuscleGroup.CHEST, equipment: Equipment.DUMBBELL, isCompound: false, defaultAlternatives: ['pec-deck', 'cab-fly-stand'] },
  'pec-deck': { id: 'pec-deck', name: 'Pec Deck Machine Fly', muscleGroup: MuscleGroup.CHEST, equipment: Equipment.MACHINE, isCompound: false, defaultAlternatives: ['db-fly-flat', 'cab-fly-stand'] },
  'cab-fly-stand': { id: 'cab-fly-stand', name: 'Standing Cable Fly', muscleGroup: MuscleGroup.CHEST, equipment: Equipment.CABLE, isCompound: false, defaultAlternatives: ['pec-deck', 'db-fly-flat'] },

  // --- SHOULDERS (PUSH) ---
  'bb-ohp': { id: 'bb-ohp', name: 'Barbell Overhead Press', muscleGroup: MuscleGroup.SHOULDERS, equipment: Equipment.BARBELL, isCompound: true, defaultAlternatives: ['db-lat-raise'] },
  'db-lat-raise': { id: 'db-lat-raise', name: 'Dumbbell Lateral Raise', muscleGroup: MuscleGroup.SHOULDERS, equipment: Equipment.DUMBBELL, isCompound: false, defaultAlternatives: ['cab-lat-raise-front', 'cab-lat-raise-behind'] },
  'cab-lat-raise-front': { id: 'cab-lat-raise-front', name: 'Single-Arm Cable Lateral Raise (In Front)', muscleGroup: MuscleGroup.SHOULDERS, equipment: Equipment.CABLE, isCompound: false, defaultAlternatives: ['db-lat-raise'] },
  'cab-lat-raise-behind': { id: 'cab-lat-raise-behind', name: 'Single-Arm Cable Lateral Raise (Behind)', muscleGroup: MuscleGroup.SHOULDERS, equipment: Equipment.CABLE, isCompound: false, defaultAlternatives: ['db-lat-raise'] },
  'db-lat-raise-inc': { id: 'db-lat-raise-inc', name: 'Single-Arm DB Lateral Raise (Incline)', muscleGroup: MuscleGroup.SHOULDERS, equipment: Equipment.DUMBBELL, isCompound: false, defaultAlternatives: ['db-lat-raise'] },
  'cab-rev-fly': { id: 'cab-rev-fly', name: 'Cable Reverse Fly', muscleGroup: MuscleGroup.SHOULDERS, equipment: Equipment.CABLE, isCompound: false, defaultAlternatives: ['mac-rev-fly'] },
  'mac-rev-fly': { id: 'mac-rev-fly', name: 'Rear Delt Machine Fly', muscleGroup: MuscleGroup.SHOULDERS, equipment: Equipment.MACHINE, isCompound: false, defaultAlternatives: ['cab-rev-fly'] },
  'bb-up-row': { id: 'bb-up-row', name: 'Barbell Upright Row', muscleGroup: MuscleGroup.SHOULDERS, equipment: Equipment.BARBELL, isCompound: true, defaultAlternatives: ['db-lat-raise'] },

  // --- TRICEPS (PUSH) ---
  'cab-tri-push': { id: 'cab-tri-push', name: 'Cable Tricep Pushdown', muscleGroup: MuscleGroup.TRICEPS, equipment: Equipment.CABLE, isCompound: false, defaultAlternatives: ['skull-crusher'] },
  'cab-oh-ext': { id: 'cab-oh-ext', name: 'Cable Overhead Tricep Extension', muscleGroup: MuscleGroup.TRICEPS, equipment: Equipment.CABLE, isCompound: false, defaultAlternatives: ['db-oh-ext-seat'] },
  'db-oh-ext-seat': { id: 'db-oh-ext-seat', name: 'Seated DB Overhead Extension (Both Hands)', muscleGroup: MuscleGroup.TRICEPS, equipment: Equipment.DUMBBELL, isCompound: false, defaultAlternatives: ['cab-oh-ext'] },
  'db-oh-ext-1h': { id: 'db-oh-ext-1h', name: 'Seated DB Overhead Extension (1 Hand)', muscleGroup: MuscleGroup.TRICEPS, equipment: Equipment.DUMBBELL, isCompound: false, defaultAlternatives: ['db-oh-ext-seat'] },
  'skull-crusher': { id: 'skull-crusher', name: 'Skull Crusher', muscleGroup: MuscleGroup.TRICEPS, equipment: Equipment.BARBELL, isCompound: false, defaultAlternatives: ['cab-tri-push'] },
  'cg-bp': { id: 'cg-bp', name: 'Close-Grip Bench Press', muscleGroup: MuscleGroup.TRICEPS, equipment: Equipment.BARBELL, isCompound: true, defaultAlternatives: ['cab-tri-push'] },

  // --- LATS (PULL) ---
  'cab-row-1h-kneel': { id: 'cab-row-1h-kneel', name: 'Single-Arm Kneeling Cable Row', muscleGroup: MuscleGroup.LATS, equipment: Equipment.CABLE, isCompound: true, defaultAlternatives: ['lm-row-1h'] },
  'cab-lat-pd': { id: 'cab-lat-pd', name: 'Cable Lat Pulldown', muscleGroup: MuscleGroup.LATS, equipment: Equipment.CABLE, isCompound: true, defaultAlternatives: ['mac-iso-pd'] },
  'cab-row-seat-lat': { id: 'cab-row-seat-lat', name: 'Seated Cable Row (Lats)', muscleGroup: MuscleGroup.LATS, equipment: Equipment.CABLE, isCompound: true, defaultAlternatives: ['cab-row-1h-kneel'] },
  'cab-lat-prayer': { id: 'cab-lat-prayer', name: 'Cable Lat Prayers', muscleGroup: MuscleGroup.LATS, equipment: Equipment.CABLE, isCompound: false, defaultAlternatives: ['cab-lat-pd'] },
  'lm-row-1h': { id: 'lm-row-1h', name: 'Landmine Row (Single-Arm)', muscleGroup: MuscleGroup.LATS, equipment: Equipment.BARBELL, isCompound: true, defaultAlternatives: ['cab-row-1h-kneel'] },
  'mac-iso-pd': { id: 'mac-iso-pd', name: 'Iso-Lat Pulldown Machine (Single-Arm)', muscleGroup: MuscleGroup.LATS, equipment: Equipment.MACHINE, isCompound: true, defaultAlternatives: ['cab-lat-pd'] },

  // --- UPPER BACK (PULL) ---
  'mac-hi-row': { id: 'mac-hi-row', name: 'High Row Machine (Single-Arm)', muscleGroup: MuscleGroup.UPPER_BACK, equipment: Equipment.MACHINE, isCompound: true, defaultAlternatives: ['cab-row-seat-ub'] },
  'mac-lo-row': { id: 'mac-lo-row', name: 'Low Row Machine (Single-Arm)', muscleGroup: MuscleGroup.UPPER_BACK, equipment: Equipment.MACHINE, isCompound: true, defaultAlternatives: ['cab-row-seat-ub'] },
  'cab-row-seat-ub': { id: 'cab-row-seat-ub', name: 'Seated Cable Row (Upper Back)', muscleGroup: MuscleGroup.UPPER_BACK, equipment: Equipment.CABLE, isCompound: true, defaultAlternatives: ['tbar-row'] },
  'tbar-row': { id: 'tbar-row', name: 'T-Bar Row (Upper Back)', muscleGroup: MuscleGroup.UPPER_BACK, equipment: Equipment.MACHINE, isCompound: true, defaultAlternatives: ['cab-row-seat-ub'] },

  // --- LOWER BACK (PULL) ---
  'back-ext': { id: 'back-ext', name: 'Back Extension', muscleGroup: MuscleGroup.LOWER_BACK, equipment: Equipment.MACHINE, isCompound: false, defaultAlternatives: [] },

  // --- BICEPS (PULL) ---
  'db-curl-stand': { id: 'db-curl-stand', name: 'Standing Dumbbell Bicep Curls', muscleGroup: MuscleGroup.BICEPS, equipment: Equipment.DUMBBELL, isCompound: false, defaultAlternatives: ['bb-curl-stand'] },
  'cab-curl-behind': { id: 'cab-curl-behind', name: 'Behind-the-Back Cable Curl', muscleGroup: MuscleGroup.BICEPS, equipment: Equipment.CABLE, isCompound: false, defaultAlternatives: ['db-curl-inc'] },
  'bb-curl-stand': { id: 'bb-curl-stand', name: 'Standing Barbell Curl', muscleGroup: MuscleGroup.BICEPS, equipment: Equipment.BARBELL, isCompound: false, defaultAlternatives: ['db-curl-stand'] },
  'db-preach-1h': { id: 'db-preach-1h', name: 'Single-Arm DB Preacher Curl', muscleGroup: MuscleGroup.BICEPS, equipment: Equipment.DUMBBELL, isCompound: false, defaultAlternatives: ['bb-preach'] },
  'bb-preach': { id: 'bb-preach', name: 'Barbell Preacher Curl', muscleGroup: MuscleGroup.BICEPS, equipment: Equipment.BARBELL, isCompound: false, defaultAlternatives: ['db-preach-1h'] },
  'db-curl-inc': { id: 'db-curl-inc', name: 'Incline Dumbbell Curl', muscleGroup: MuscleGroup.BICEPS, equipment: Equipment.DUMBBELL, isCompound: false, defaultAlternatives: ['cab-curl-behind'] },

  // --- LEGS ---
  'leg-ext': { id: 'leg-ext', name: 'Leg Extension', muscleGroup: MuscleGroup.LEGS, equipment: Equipment.MACHINE, isCompound: false, defaultAlternatives: ['sq-hack'] },
  'leg-press': { id: 'leg-press', name: 'Leg Press', muscleGroup: MuscleGroup.LEGS, equipment: Equipment.MACHINE, isCompound: true, defaultAlternatives: ['sq-hack', 'sq-pend'] },
  'leg-curl-seat': { id: 'leg-curl-seat', name: 'Seated Leg Curl', muscleGroup: MuscleGroup.LEGS, equipment: Equipment.MACHINE, isCompound: false, defaultAlternatives: ['leg-curl-lie'] },
  'leg-curl-lie': { id: 'leg-curl-lie', name: 'Lying Leg Curl', muscleGroup: MuscleGroup.LEGS, equipment: Equipment.MACHINE, isCompound: false, defaultAlternatives: ['leg-curl-seat'] },
  'sq-hack': { id: 'sq-hack', name: 'Hack Squat Machine', muscleGroup: MuscleGroup.LEGS, equipment: Equipment.MACHINE, isCompound: true, defaultAlternatives: ['sq-pend', 'leg-press'] },
  'hip-thrust-mac': { id: 'hip-thrust-mac', name: 'Hip Thrust Machine', muscleGroup: MuscleGroup.GLUTES, equipment: Equipment.MACHINE, isCompound: true, defaultAlternatives: [] },
  'calf-raise-stand': { id: 'calf-raise-stand', name: 'Standing Calf Raise Machine', muscleGroup: MuscleGroup.CALVES, equipment: Equipment.MACHINE, isCompound: false, defaultAlternatives: ['calf-raise-seat'] },
  'calf-raise-seat': { id: 'calf-raise-seat', name: 'Seated Calf Raise Machine', muscleGroup: MuscleGroup.CALVES, equipment: Equipment.MACHINE, isCompound: false, defaultAlternatives: ['calf-raise-stand'] },
  'hip-abd-mac': { id: 'hip-abd-mac', name: 'Hip Abductor Machine', muscleGroup: MuscleGroup.GLUTES, equipment: Equipment.MACHINE, isCompound: false, defaultAlternatives: [] },
  'sq-pend': { id: 'sq-pend', name: 'Pendulum Squat Machine', muscleGroup: MuscleGroup.LEGS, equipment: Equipment.MACHINE, isCompound: true, defaultAlternatives: ['sq-hack'] },
};

export const DEFAULT_TEMPLATES: SessionTemplate[] = [
  {
    id: 'tpl-push',
    name: 'Push Day',
    exerciseIds: [
      'sm-inc-bp',        // Chest Compound
      'pec-deck',         // Chest Isolation
      'bb-ohp',           // Shoulder Compound
      'db-lat-raise',     // Shoulder Isolation
      'cab-tri-push',     // Tricep Isolation
      'cab-oh-ext'        // Tricep Stretch
    ],
    defaultSets: 4,
    defaultReps: 12
  },
  {
    id: 'tpl-pull',
    name: 'Pull Day',
    exerciseIds: [
      'cab-lat-pd',       // Lats Vertical
      'cab-row-seat-ub',  // Upper Back Horizontal
      'mac-iso-pd',       // Lats Single Arm
      'back-ext',         // Lower Back
      'db-curl-stand',    // Bicep
      'bb-preach'         // Bicep Isolation
    ],
    defaultSets: 4,
    defaultReps: 12
  },
  {
    id: 'tpl-legs',
    name: 'Leg Day',
    exerciseIds: [
      'sq-hack',          // Quad Compound
      'leg-press',        // Compound Volume
      'leg-ext',          // Quad Isolation
      'leg-curl-seat',    // Hamstring
      'calf-raise-stand', // Calves
      'hip-thrust-mac'    // Glutes
    ],
    defaultSets: 4,
    defaultReps: 12
  },
  {
    id: 'tpl-upper',
    name: 'Upper Body',
    exerciseIds: [
      'sm-inc-bp',        // Push: Chest Compound
      'cab-lat-pd',       // Pull: Lats Vertical
      'bb-ohp',           // Push: Shoulder Compound
      'cab-row-seat-ub',  // Pull: Upper Back
      'pec-deck',         // Push: Chest Iso
      'mac-iso-pd',       // Pull: Lats Iso
      'db-lat-raise',     // Push: Shoulder Iso
      'cab-tri-push',     // Push: Triceps
      'db-curl-stand',    // Pull: Biceps
      'cab-oh-ext',       // Push: Tricep Stretch
      'bb-preach',        // Pull: Bicep Iso
      'back-ext'          // Pull: Lower Back
    ],
    defaultSets: 3,
    defaultReps: 12
  },
  {
    id: 'tpl-lower',
    name: 'Lower Body',
    exerciseIds: [
      'sq-hack',
      'leg-press',
      'leg-ext',
      'leg-curl-seat',
      'calf-raise-stand',
      'hip-thrust-mac'
    ],
    defaultSets: 4,
    defaultReps: 12
  }
];

export const WEIGHT_INCREMENT = 2.5;
export const DUMBBELL_WEIGHT_INCREMENT = 2;
export const DUMBBELL_MIN_WEIGHT = 4;
export const FATIGUE_FACTOR = 0.05; // 5% weight reduction per slot moved down for compounds

// Helper to get weight increment based on equipment type
export const getWeightIncrement = (equipment: Equipment): number => {
  return equipment === Equipment.DUMBBELL ? DUMBBELL_WEIGHT_INCREMENT : WEIGHT_INCREMENT;
};

// Helper to get minimum weight based on equipment type
export const getMinWeight = (equipment: Equipment): number => {
  return equipment === Equipment.DUMBBELL ? DUMBBELL_MIN_WEIGHT : 0;
};
