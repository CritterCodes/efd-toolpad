import { useCallback, useEffect, useState } from 'react';
import { artisanApplicationsClient } from '@/api-clients/artisanApplications.client';

const EMPTY_STATS = { total: 0, pending: 0, approved: 0, rejected: 0 };

export function useArtisanApplications() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [applicationsData, statsData] = await Promise.all([
        artisanApplicationsClient.getAll(),
        artisanApplicationsClient.getStats()
      ]);

      setApplications(applicationsData);
      setStats({ ...EMPTY_STATS, ...statsData });
    } catch (err) {
      console.error('Error loading artisan applications:', err);
      setError(err.message || 'Failed to load artisan applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateStatus = async (applicationId, status, reviewNotes) => {
    try {
      setLoading(true);
      setError('');
      await artisanApplicationsClient.updateStatus(applicationId, status, reviewNotes);
      await loadData();
    } catch (err) {
      console.error('Error updating artisan application:', err);
      setError(err.message || 'Failed to update artisan application');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteApplication = async (applicationId) => {
    try {
      setLoading(true);
      setError('');
      await artisanApplicationsClient.delete(applicationId);
      await loadData();
    } catch (err) {
      console.error('Error deleting artisan application:', err);
      setError(err.message || 'Failed to delete artisan application');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    applications,
    stats,
    loading,
    error,
    refreshData: loadData,
    approveApplication: (applicationId, reviewNotes) => updateStatus(applicationId, 'approved', reviewNotes),
    rejectApplication: (applicationId, reviewNotes) => updateStatus(applicationId, 'rejected', reviewNotes),
    deleteApplication
  };
}
