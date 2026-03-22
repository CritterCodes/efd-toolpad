import { useState, useEffect, useCallback } from 'react';
import { wholesaleClient } from '@/api-clients/wholesale.client';

export const useWholesaleManagement = () => {
  const [wholesalers, setWholesalers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const wholesalersData = await wholesaleClient.getWholesalers();
      const applicationsData = await wholesaleClient.getAllApplications();
      const statsData = await wholesaleClient.getStats();
      
      if (wholesalersData.success) {
        setWholesalers(wholesalersData.data || []);
      }
      
      setApplications(applicationsData || []);
      setStats(statsData || { total: 0, pending: 0, approved: 0, rejected: 0 });
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

  return {
    wholesalers,
    applications,
    stats,
    loading,
    error,
    handleApprove,
    handleReject,
    refreshData: loadData
  };
};