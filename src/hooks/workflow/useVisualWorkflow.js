import { useState } from 'react';
import {
  getInternalStatusInfo,
  getNextPossibleStatuses,
  getClientStatusDisplay,
  INTERNAL_STATUSES
} from '../../config/statuses';

// Define the main workflow stages in order
export const WORKFLOW_STAGES = [
  {
    id: 'initial',
    label: 'Initial Review',
    statuses: [
      INTERNAL_STATUSES.PENDING,
      INTERNAL_STATUSES.NEEDS_QUOTE,
      INTERNAL_STATUSES.QUOTE_SENT
    ]
  },
  {
    id: 'approval',
    label: 'Client Approval',
    statuses: [
      INTERNAL_STATUSES.AWAITING_APPROVAL,
      INTERNAL_STATUSES.DEPOSIT_REQUIRED,
      INTERNAL_STATUSES.DEPOSIT_RECEIVED,
      INTERNAL_STATUSES.UPDATED_BY_CLIENT,
      INTERNAL_STATUSES.WAITING_FOR_CLIENT
    ]
  },
  {
    id: 'design',
    label: 'Design Phase',
    statuses: [
      INTERNAL_STATUSES.IN_CAD,
      INTERNAL_STATUSES.CAD_REVIEW,
      INTERNAL_STATUSES.CAD_APPROVED,
      INTERNAL_STATUSES.CAD_REVISION
    ]
  },
  {
    id: 'preparation',
    label: 'Production Prep',
    statuses: [
      INTERNAL_STATUSES.GATHERING_MATERIALS,
      INTERNAL_STATUSES.NEEDS_PARTS,
      INTERNAL_STATUSES.PARTS_ORDERED,
      INTERNAL_STATUSES.READY_FOR_WORK
    ]
  },
  {
    id: 'production',
    label: 'Production',
    statuses: [
      INTERNAL_STATUSES.IN_PRODUCTION,
      INTERNAL_STATUSES.CASTING,
      INTERNAL_STATUSES.SETTING_STONES,
      INTERNAL_STATUSES.FINISHING
    ]
  },
  {
    id: 'completion',
    label: 'Completion',
    statuses: [
      INTERNAL_STATUSES.QUALITY_CONTROL,
      INTERNAL_STATUSES.QC_FAILED,
      INTERNAL_STATUSES.READY_FOR_PICKUP,
      INTERNAL_STATUSES.COMPLETED
    ]
  }
];

export function useVisualWorkflow({ currentStatus, onStatusChange, disabled = false }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStageForMenu, setSelectedStageForMenu] = useState(null);

  const currentStatusInfo = getInternalStatusInfo(currentStatus);
  const nextStatuses = getNextPossibleStatuses(currentStatus);
  const clientView = getClientStatusDisplay(currentStatus);

  // Find which stage contains the current status
  const getCurrentStageIndex = () => {
    return WORKFLOW_STAGES.findIndex(stage =>
      stage.statuses.includes(currentStatus)
    );
  };

  const currentStageIndex = getCurrentStageIndex();

  // Get stage completion status
  const getStageStatus = (stageIndex, stage) => {
    if (
      currentStatus === INTERNAL_STATUSES.CANCELLED ||
      currentStatus === INTERNAL_STATUSES.DEAD_LEAD ||
      currentStatus === INTERNAL_STATUSES.ON_HOLD
    ) {
      return stageIndex < currentStageIndex ? 'completed' : 'cancelled';
    }

    if (stageIndex < currentStageIndex) return 'completed';
    if (stageIndex === currentStageIndex) return 'active';
    return 'pending';
  };

  const handleStageClick = (event, stage, stageIndex) => {
    if (disabled || stageIndex > currentStageIndex + 1) return;

    setAnchorEl(event.currentTarget);
    setSelectedStageForMenu({ stage, stageIndex });
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedStageForMenu(null);
  };

  const handleStatusSelect = (status) => {
    onStatusChange(status);
    handleMenuClose();
  };

  const isSpecialStatus = [
    INTERNAL_STATUSES.CANCELLED,
    INTERNAL_STATUSES.DEAD_LEAD,
    INTERNAL_STATUSES.ON_HOLD
  ].includes(currentStatus);

  return {
    // State
    anchorEl,
    selectedStageForMenu,
    
    // Status info
    currentStatusInfo,
    nextStatuses,
    clientView,
    currentStageIndex,
    isSpecialStatus,
    
    // Handlers
    handleStageClick,
    handleMenuClose,
    handleStatusSelect,
    getStageStatus,
    
    // Config
    disabled
  };
}
