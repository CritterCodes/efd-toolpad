import { SKILL_LEVEL, SKILL_LEVEL_MULTIPLIERS, DEFAULT_SKILL_LEVEL } from '@/constants/pricing.constants.mjs';

// Process Categories
export const PROCESS_CATEGORIES = [
  'sizing',
  'stone_setting',
  'repair',
  'restoration',
  'cleaning',
  'engraving',
  'manufacturing',
  'custom_work',
  'rhodium_plating',
  'soldering'
];

// Skill Levels - Uses constants from pricing.constants.mjs for consistency
export const SKILL_LEVELS = [
  { value: SKILL_LEVEL.BASIC, label: 'Basic', multiplier: SKILL_LEVEL_MULTIPLIERS[SKILL_LEVEL.BASIC] },
  { value: SKILL_LEVEL.STANDARD, label: 'Standard', multiplier: SKILL_LEVEL_MULTIPLIERS[SKILL_LEVEL.STANDARD] },
  { value: SKILL_LEVEL.ADVANCED, label: 'Advanced', multiplier: SKILL_LEVEL_MULTIPLIERS[SKILL_LEVEL.ADVANCED] },
  { value: SKILL_LEVEL.EXPERT, label: 'Expert', multiplier: SKILL_LEVEL_MULTIPLIERS[SKILL_LEVEL.EXPERT] }
];

// Metal Types
export const METAL_TYPES = [
  { value: 'yellow_gold', label: 'Yellow Gold' },
  { value: 'white_gold', label: 'White Gold' },
  { value: 'rose_gold', label: 'Rose Gold' },
  { value: 'sterling_silver', label: 'Sterling Silver' },
  { value: 'fine_silver', label: 'Fine Silver' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'palladium', label: 'Palladium' },
  { value: 'titanium', label: 'Titanium' },
  { value: 'stainless_steel', label: 'Stainless Steel' },
  { value: 'alternative', label: 'Alternative Metal' },
  { value: 'mixed', label: 'Mixed Metals' },
  { value: 'n_a', label: 'Not Applicable' }
];

// Karat/Purity Options organized by metal type
export const KARAT_OPTIONS = {
  yellow_gold: [
    { value: '10k', label: '10K' },
    { value: '14k', label: '14K' },
    { value: '18k', label: '18K' },
    { value: '22k', label: '22K' },
    { value: '24k', label: '24K' }
  ],
  white_gold: [
    { value: '10k', label: '10K' },
    { value: '14k', label: '14K' },
    { value: '18k', label: '18K' }
  ],
  rose_gold: [
    { value: '10k', label: '10K' },
    { value: '14k', label: '14K' },
    { value: '18k', label: '18K' }
  ],
  sterling_silver: [
    { value: '925', label: '925' },
    { value: '900', label: '900' }
  ],
  fine_silver: [
    { value: '999', label: '999' }
  ],
  platinum: [
    { value: '950', label: '950' },
    { value: '900', label: '900' }
  ],
  palladium: [
    { value: '950', label: '950' },
    { value: '900', label: '900' }
  ],
  titanium: [
    { value: 'grade1', label: 'Grade 1' },
    { value: 'grade2', label: 'Grade 2' },
    { value: 'grade4', label: 'Grade 4' }
  ],
  stainless_steel: [
    { value: '316l', label: '316L' },
    { value: '304', label: '304' }
  ],
  alternative: [
    { value: 'na', label: 'N/A' }
  ],
  mixed: [
    { value: 'na', label: 'N/A' }
  ],
  n_a: [
    { value: 'na', label: 'N/A' }
  ]
};

// Complexity Multipliers
export const COMPLEXITY_MULTIPLIERS = [
  { value: 0.5, label: 'Very Simple (0.5x)' },
  { value: 0.75, label: 'Simple (0.75x)' },
  { value: 1.0, label: 'Standard (1.0x)' },
  { value: 1.25, label: 'Complex (1.25x)' },
  { value: 1.5, label: 'Very Complex (1.5x)' },
  { value: 2.0, label: 'Extremely Complex (2.0x)' }
];

// Default form values
export const DEFAULT_PROCESS_FORM = {
  displayName: '',
  category: '',
  laborHours: 0,
  skillLevel: DEFAULT_SKILL_LEVEL,
  description: '',
  materials: [],
  isActive: true
};
