import {
    MOVE_PAGE_STATUS_OPTIONS,
    STATUS_DESCRIPTIONS,
    STATUS_FIELD_LABELS,
    STATUS_HELP_TEXT,
    TRACKABLE_MOVE_STATUSES,
} from '@/services/repairWorkflow';

// Status options are centralized in the workflow helper so move and bench stay aligned.
export const REPAIR_STATUSES = MOVE_PAGE_STATUS_OPTIONS;
export const TRACKABLE_STATUSES = TRACKABLE_MOVE_STATUSES;
export { STATUS_DESCRIPTIONS, STATUS_FIELD_LABELS, STATUS_HELP_TEXT };
