'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

const DEFAULT_CHECKLIST = {
  'Visual inspection completed': false,
  'All stones secure': false,
  'Clasp and findings tested': false,
  'Polish and finish approved': false,
  'Sizing/specification verified': false,
  'Final photos captured': false
};

const mapDecisionToStatus = (decision) => {
  if (decision === 'APPROVED') {
    return 'ready_for_pickup';
  }
  if (decision === 'REJECTED') {
    return 'ready_for_work';
  }
  return 'quality_control';
};

export const useQualityControl = ({ params } = {}) => {
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validationNotes, setValidationNotes] = useState('');
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const routeParams = useParams();

  const routeRepairId = params?.repairID || routeParams?.repairID;

  const hydrateFromRepair = (repairData) => {
    const existingChecklist = repairData?.qcData?.checklist;
    const normalizedChecklist =
      existingChecklist && typeof existingChecklist === 'object'
        ? { ...DEFAULT_CHECKLIST, ...existingChecklist }
        : DEFAULT_CHECKLIST;

    setChecklist(normalizedChecklist);
    setValidationNotes(repairData?.qcData?.notes || repairData?.notes || '');
    setRepair(repairData);
  };

  useEffect(() => {
    const loadRepair = async () => {
      if (!routeRepairId) {
        setError('Repair ID is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Primary lookup by repairID.
        let response = await fetch(`/api/repairs?repairID=${encodeURIComponent(routeRepairId)}`);

        if (response.ok) {
          const repairData = await response.json();
          hydrateFromRepair(repairData);
          return;
        }

        // Fallback for routes created from _id links.
        response = await fetch('/api/repairs');
        if (!response.ok) {
          throw new Error('Failed to load repair data.');
        }

        const repairs = await response.json();
        const matchedRepair = (repairs || []).find(
          (item) => item?.repairID === routeRepairId || item?._id === routeRepairId
        );

        if (!matchedRepair) {
          throw new Error('Repair not found.');
        }

        hydrateFromRepair(matchedRepair);
      } catch (loadError) {
        console.error('Failed loading quality control repair:', loadError);
        setError(loadError.message || 'Unable to load repair.');
      } finally {
        setLoading(false);
      }
    };

    loadRepair();
  }, [routeRepairId]);

  const handleStatusUpdate = async (decision) => {
    if (!repair?.repairID) {
      setError('Repair is missing a repairID and cannot be updated.');
      return;
    }

    const checklistValues = Object.values(checklist);
    const allChecklistItemsComplete = checklistValues.length > 0 && checklistValues.every(Boolean);

    if (decision === 'APPROVED' && !allChecklistItemsComplete) {
      setError('Complete all checklist items before approving quality control.');
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      const nextStatus = mapDecisionToStatus(decision);
      const updatePayload = {
        status: nextStatus,
        notes: validationNotes,
        qcBy: repair?.qcBy || 'QC Inspector',
        qcDate: new Date().toISOString(),
        qcData: {
          ...(repair?.qcData || {}),
          decision,
          checklist,
          notes: validationNotes,
          completedAt: new Date().toISOString()
        }
      };

      const response = await fetch(`/api/repairs?repairID=${encodeURIComponent(repair.repairID)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new Error(failure?.error || 'Failed to update quality control status.');
      }

      const updatedRepair = await response.json();
      setRepair(updatedRepair);
      router.push('/dashboard/repairs/quality-control');
    } catch (updateError) {
      console.error('Quality control status update failed:', updateError);
      setError(updateError.message || 'Unable to update quality control status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleValidationChange = (key, checked) => {
    setChecklist((previousChecklist) => ({
      ...previousChecklist,
      [key]: checked
    }));
  };

  return {
    repair,
    loading,
    error,
    validationNotes,
    setValidationNotes,
    handleStatusUpdate,
    handleValidationChange,
    checklist,
    setChecklist,
    isUpdating
  };
};
