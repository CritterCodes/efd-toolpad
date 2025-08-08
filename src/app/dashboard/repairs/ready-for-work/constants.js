// Ready for Work constants
export const WORK_PRIORITIES = [
    { value: 'all', label: 'All Items' },
    { value: 'rush', label: 'Rush Orders' },
    { value: 'due-today', label: 'Due Today' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'due-this-week', label: 'Due This Week' }
];

export const SORT_OPTIONS = [
    { value: 'promise-date-asc', label: 'Due Date (Earliest First)' },
    { value: 'promise-date-desc', label: 'Due Date (Latest First)' },
    { value: 'created-desc', label: 'Recently Added' },
    { value: 'created-asc', label: 'Oldest First' },
    { value: 'client-name', label: 'Client Name A-Z' }
];

export const JEWELER_ASSIGNMENTS = [
    'Unassigned',
    'John Smith',
    'Sarah Johnson', 
    'Mike Wilson',
    'Lisa Davis'
];

export const WORK_TYPES = [
    { value: 'sizing', label: 'Ring Sizing', color: 'primary' },
    { value: 'repair', label: 'Repair', color: 'secondary' },
    { value: 'cleaning', label: 'Cleaning', color: 'success' },
    { value: 'stone-setting', label: 'Stone Setting', color: 'warning' },
    { value: 'engraving', label: 'Engraving', color: 'info' },
    { value: 'custom', label: 'Custom Work', color: 'error' }
];

export const COMPLEXITY_LEVELS = [
    { value: 'simple', label: 'Simple (< 30 min)', color: 'success' },
    { value: 'moderate', label: 'Moderate (30min - 2hr)', color: 'warning' },
    { value: 'complex', label: 'Complex (2hr+)', color: 'error' }
];
