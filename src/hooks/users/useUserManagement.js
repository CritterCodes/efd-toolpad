import { useState, useEffect } from 'react';

export const useUserManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionDialog, setActionDialog] = useState({
    open: false,
    action: null,
    user: null,
    reason: '',
    notes: ''
  });

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/approve');
      const data = await response.json();
      
      if (data.success) {
        setPendingUsers(data.users);
      } else {
        setError(data.error || 'Failed to load pending users');
      }
    } catch (err) {
      setError('Failed to load pending users');
      console.error('Error fetching pending users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    try {
      const { action, user, reason, notes } = actionDialog;
      
      const response = await fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userID: user.userID,
          reason: action === 'reject' ? reason : undefined,
          notes
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Remove user from pending list
        setPendingUsers(prev => prev.filter(u => u.userID !== user.userID));
        closeActionDialog();
      } else {
        setError(data.error || `Failed to ${action} user`);
      }
    } catch (err) {
      setError(`Failed to ${actionDialog.action} user`);
      console.error('Error processing user action:', err);
    }
  };

  const openActionDialog = (action, user) => {
    setActionDialog({
      open: true,
      action,
      user,
      reason: '',
      notes: ''
    });
  };

  const closeActionDialog = () => {
    setActionDialog({ open: false, action: null, user: null, reason: '', notes: '' });
  };

  const setActionDialogField = (field, value) => {
    setActionDialog(prev => ({ ...prev, [field]: value }));
  };

  return {
    tabValue,
    setTabValue,
    pendingUsers,
    loading,
    error,
    setError,
    actionDialog,
    openActionDialog,
    closeActionDialog,
    setActionDialogField,
    handleAction
  };
};