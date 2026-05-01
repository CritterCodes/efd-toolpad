import { useState, useEffect, useCallback } from 'react';
import { wholesaleClient } from '@/api-clients/wholesale.client';

export const useWholesaleManagement = () => {
  const [wholesalers, setWholesalers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [reconciliation, setReconciliation] = useState({ stats: {}, legacyWholesalers: [], safeMatches: [], ambiguousMatches: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [wholesalersData, applicationsData, statsData, reconciliationData] = await Promise.all([
        wholesaleClient.getWholesalers(),
        wholesaleClient.getAllApplications(),
        wholesaleClient.getStats(),
        wholesaleClient.getReconciliation(),
      ]);
      
      if (wholesalersData.success) {
        setWholesalers(wholesalersData.data || []);
      }
      
      setApplications(applicationsData || []);
      setStats(statsData || { total: 0, pending: 0, approved: 0, rejected: 0 });
      setReconciliation(reconciliationData || { stats: {}, legacyWholesalers: [], safeMatches: [], ambiguousMatches: [] });
      setError(null);
    } catch (error) {
      console.error('Error loading wholesale data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (applicationId, reviewNotes) => {
    try {
      setLoading(true);
      await wholesaleClient.approveApplication(applicationId, reviewNotes);
      await loadData();
    } catch (error) {
      console.error('Error approving application:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (applicationId, reviewNotes) => {
    try {
      setLoading(true);
      await wholesaleClient.rejectApplication(applicationId, reviewNotes);
      await loadData();
    } catch (error) {
      console.error('Error rejecting application:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReconciliationAction = async (payload) => {
    try {
      setLoading(true);
      await wholesaleClient.reconcile(payload);
      await loadData();
    } catch (error) {
      console.error('Error reconciling wholesale data:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    wholesalers,
    applications,
    reconciliation,
    stats,
    loading,
    error,
    handleApprove,
    handleReject,
    handleReconciliationAction,
    refreshData: loadData
  };
};
