import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useArtisanDrop() {
  const { data: session } = useSession();
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('open');
  const [submissions, setSubmissions] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [portfolioFiles, setPortfolioFiles] = useState([]);
  const [portfolioNotes, setPortfolioNotes] = useState('');

  // Fetch drops available for this artisan
  useEffect(() => {
    if (!session?.user?.id) return;
    fetchDrops();
  }, [session]);

  async function fetchDrops() {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch drops filtered by artisan's types
      const artisanTypes = session.user.artisanTypes || [];
      const res = await fetch(`/api/drop-requests?status=open&artisanTypes=${artisanTypes.join(',')}`);
      
      if (!res.ok) throw new Error(`Failed to fetch drops: ${res.statusText}`);
      
      const data = await res.json();
      setDrops(data.drops || []);
      
      // Fetch this artisan's submissions
      const submissionsRes = await fetch(`/api/artisan/drops/submissions?userId=${session.user.id}`);
      if (submissionsRes.ok) {
        const subData = await submissionsRes.json();
        const subMap = {};
        subData.submissions?.forEach(sub => {
          subMap[sub.dropId] = sub;
        });
        setSubmissions(subMap);
      }
    } catch (err) {
      console.error('Error fetching drops:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle portfolio file upload
  async function handlePortfolioUpload(files) {
    try {
      setError(null);
      const uploadedFiles = [];
      
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'portfolio');
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
        
        const data = await res.json();
        uploadedFiles.push({
          url: data.url,
          filename: data.filename,
          type: file.type
        });
      }
      
      setPortfolioFiles([...portfolioFiles, ...uploadedFiles]);
    } catch (err) {
      console.error('Error uploading portfolio:', err);
      setError(`Portfolio upload failed: ${err.message}`);
    }
  }

  // Remove portfolio file
  function removePortfolioFile(index) {
    setPortfolioFiles(portfolioFiles.filter((_, i) => i !== index));
  }

  // Handle submit to drop
  async function handleSubmitToDrop(dropId, callback) {
    if (portfolioFiles.length === 0) {
      setError('Please upload at least one portfolio file');
      return;
    }

    try {
      setSubmitting(dropId);
      setError(null);
      
      const res = await fetch(`/api/drop-requests/${dropId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          artisanId: session.user.artisanId,
          portfolio: portfolioFiles,
          notes: portfolioNotes
        })
      });
      
      if (!res.ok) throw new Error(`Submission failed: ${res.statusText}`);
      
      const data = await res.json();
      setSubmissions({
        ...submissions,
        [dropId]: data.submission
      });
      
      // Reset form
      setPortfolioFiles([]);
      setPortfolioNotes('');
      if (callback) callback();
    } catch (err) {
      console.error('Error submitting to drop:', err);
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  }

  // Handle withdraw submission
  async function handleWithdrawSubmission(dropId, callback) {
    if (!confirm('Withdraw your submission from this drop?')) return;

    try {
      setSubmitting(dropId);
      const res = await fetch(`/api/drop-requests/${dropId}/submissions/${submissions[dropId]._id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) throw new Error(`Withdrawal failed: ${res.statusText}`);
      
      const newSubmissions = { ...submissions };
      delete newSubmissions[dropId];
      setSubmissions(newSubmissions);
      if (callback) callback();
    } catch (err) {
      console.error('Error withdrawing submission:', err);
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  }

  // Get submission status for a drop
  function getSubmissionStatus(dropId) {
    const submission = submissions[dropId];
    if (!submission) return 'not-submitted';
    return submission.status || 'pending';
  }

  return {
    session,
    drops,
    loading,
    error,
    setError,
    filterStatus,
    setFilterStatus,
    submissions,
    submitting,
    portfolioFiles,
    portfolioNotes,
    setPortfolioNotes,
    handlePortfolioUpload,
    removePortfolioFile,
    handleSubmitToDrop,
    handleWithdrawSubmission,
    getSubmissionStatus
  };
}
