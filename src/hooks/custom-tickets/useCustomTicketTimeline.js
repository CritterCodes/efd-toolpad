import { useState } from 'react';
import { 
  getClientStatusDisplay, 
  getInternalStatusInfo,
  getNextPossibleStatuses
} from '@/config/statuses';

export function useCustomTicketTimeline({ 
  ticket, 
  availableStatuses = [], 
  onStatusUpdate 
}) {
  const [showEditor, setShowEditor] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  if (!ticket) return null;

  const currentStatus = ticket.status;
  const statusInfo = getInternalStatusInfo(currentStatus);
  const clientDisplay = getClientStatusDisplay(currentStatus);

  // Get available statuses with fallback
  const nextStatuses = availableStatuses.length > 0 
    ? availableStatuses 
    : getNextPossibleStatuses(currentStatus);

  // Define the main workflow steps for the timeline
  const workflowSteps = [
    {
      category: 'initial',
      label: 'Initial Review',
      statuses: ['pending', 'reviewing-request', 'in-consultation', 'awaiting-client-info']
    },
    {
      category: 'design',
      label: 'Design Process',
      statuses: ['sketching', 'sketch-review', 'sketch-approved', 'creating-cad', 'cad-review', 'cad-revision', 'cad-approved']
    },
    {
      category: 'quote',
      label: 'Quote & Approval',
      statuses: ['preparing-quote', 'quote-sent', 'quote-revision', 'quote-approved']
    },
    {
      category: 'payment',
      label: 'Payment Processing',
      statuses: ['deposit-invoice-sent', 'deposit-received']
    },
    {
      category: 'production',
      label: 'Production',
      statuses: ['ordering-materials', 'materials-received', 'ready-for-production', 'in-production', 'casting', 'setting-stones', 'polishing', 'quality-check']
    },
    {
      category: 'completion',
      label: 'Completion',
      statuses: ['final-payment-sent', 'paid-in-full', 'ready-for-pickup', 'shipped', 'delivered', 'completed']
    }
  ];

  const getCurrentStep = () => {
    return workflowSteps.findIndex(step => 
      step.statuses.includes(currentStatus)
    );
  };

  const getStepStatus = (step, index) => {
    const currentStepIndex = getCurrentStep();
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'current';
    return 'pending';
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !onStatusUpdate) return;
    const result = await onStatusUpdate(selectedStatus);
    if (result && result.success) {
      setSelectedStatus('');
      setShowEditor(false);
    }
  };

  return {
    showEditor, setShowEditor,
    selectedStatus, setSelectedStatus,
    currentStatus, statusInfo, clientDisplay,
    nextStatuses, workflowSteps,
    getCurrentStep, getStepStatus,
    handleStatusUpdate
  };
}
