'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import styles from './ArtisanDropParticipation.module.css';

/**
 * ArtisanDropParticipation Component
 * Allows artisans to:
 * - Browse available drops
 * - Filter drops by their artisan types and status
 * - View drop details and requirements
 * - Submit their portfolio for a drop
 * - Track their submission status
 * - View results (if selected/rejected)
 */
export default function ArtisanDropParticipation() {
  const { data: session } = useSession();
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDrop, setSelectedDrop] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
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
  async function handleSubmitToDrop(dropId) {
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
      setShowDetailModal(false);
    } catch (err) {
      console.error('Error submitting to drop:', err);
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  }

  // Handle withdraw submission
  async function handleWithdrawSubmission(dropId) {
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
      setShowDetailModal(false);
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

  // Get status badge styling
  const getStatusColor = (status) => {
    const colors = {
      'open': '#10b981',
      'closed': '#ef4444',
      'in-review': '#f59e0b',
      'completed': '#6366f1',
      'pending': '#eab308',
      'approved': '#10b981',
      'rejected': '#ef4444',
      'not-submitted': '#9ca3af'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'open': 'Now Open',
      'closed': 'Closed',
      'in-review': 'In Review',
      'completed': 'Completed',
      'pending': 'Pending Review',
      'approved': 'Selected!',
      'rejected': 'Not Selected',
      'not-submitted': 'Not Submitted'
    };
    return labels[status] || status;
  };

  if (!session?.user?.id) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <p>Please log in to view drop opportunities</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Drop Opportunities</h1>
          <p className={styles.subtitle}>Browse and submit to drops that match your artisan specialties</p>
        </div>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Status Filter */}
      <div className={styles.filterBar}>
        {['open', 'closed', 'in-review', 'completed'].map(status => (
          <button
            key={status}
            className={`${styles.filterButton} ${filterStatus === status ? styles.active : ''}`}
            onClick={() => setFilterStatus(status)}
          >
            {getStatusLabel(status)}
            <span className={styles.count}>
              {drops.filter(d => d.status === status).length}
            </span>
          </button>
        ))}
      </div>

      {loading && <div className={styles.loading}>Loading drop opportunities...</div>}

      {!loading && drops.length === 0 && (
        <div className={styles.emptyState}>
          <p>🎨 No drops available for your specialties right now</p>
          <p className={styles.hint}>Complete your artisan profile to unlock more opportunities</p>
        </div>
      )}

      {!loading && drops.length > 0 && (
        <div className={styles.dropGrid}>
          {drops.map(drop => {
            const submissionStatus = getSubmissionStatus(drop._id);
            const isSubmitted = submissionStatus !== 'not-submitted';
            
            return (
              <div 
                key={drop._id}
                className={styles.dropCard}
                onClick={() => {
                  setSelectedDrop(drop);
                  setShowDetailModal(true);
                }}
              >
                <div className={styles.cardHeader}>
                  <h3>{drop.theme}</h3>
                  <div 
                    className={styles.statusBadge}
                    style={{ backgroundColor: getStatusColor(drop.status) }}
                  >
                    {getStatusLabel(drop.status)}
                  </div>
                </div>

                <p className={styles.description}>{drop.publicDescription?.substring(0, 120)}...</p>

                <div className={styles.cardInfo}>
                  <span>📅 {new Date(drop.startDate).toLocaleDateString()}</span>
                  <span>👥 {drop.selectedArtisans?.length || 0} selected</span>
                </div>

                {isSubmitted && (
                  <div 
                    className={styles.submissionBadge}
                    style={{ backgroundColor: getStatusColor(submissionStatus) }}
                  >
                    ✓ {getStatusLabel(submissionStatus)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedDrop && (
        <div className={styles.modal} onClick={() => setShowDetailModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={() => setShowDetailModal(false)}>✕</button>
            
            <div className={styles.detailLayout}>
              <div className={styles.detailInfo}>
                <div className={styles.header}>
                  <div>
                    <h2>{selectedDrop.theme}</h2>
                    <div 
                      className={styles.statusBadgeLarge}
                      style={{ backgroundColor: getStatusColor(selectedDrop.status) }}
                    >
                      {getStatusLabel(selectedDrop.status)}
                    </div>
                  </div>
                </div>

                <div className={styles.detailGrid}>
                  <div>
                    <label>Status</label>
                    <p>{getStatusLabel(selectedDrop.status)}</p>
                  </div>
                  <div>
                    <label>Start Date</label>
                    <p>{new Date(selectedDrop.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label>End Date</label>
                    <p>{new Date(selectedDrop.endDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label>Artisans Selected</label>
                    <p>{selectedDrop.selectedArtisans?.length || 0}</p>
                  </div>
                </div>

                <div>
                  <label>Public Description</label>
                  <p className={styles.description}>{selectedDrop.publicDescription}</p>
                </div>

                <div>
                  <label>📋 Artisan Briefing</label>
                  <p className={styles.briefing}>{selectedDrop.artisanBriefing}</p>
                </div>

                {selectedDrop.targetArtisanTypes && selectedDrop.targetArtisanTypes.length > 0 && (
                  <div>
                    <label>Looking For</label>
                    <div className={styles.tags}>
                      {selectedDrop.targetArtisanTypes.map((type, idx) => (
                        <span key={idx} className={styles.tag}>{type}</span>
                      ))}
                    </div>
                  </div>
                )}

                {submissions[selectedDrop._id]?.rejectionReason && (
                  <div className={styles.rejectionNotes}>
                    <label>💭 Feedback</label>
                    <p>{submissions[selectedDrop._id].rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Submission Section */}
              <div className={styles.submissionSection}>
                {getSubmissionStatus(selectedDrop._id) === 'not-submitted' ? (
                  <>
                    <h3>Submit Your Portfolio</h3>
                    
                    <div className={styles.uploadArea}>
                      <label>Upload Portfolio Files</label>
                      <div className={styles.fileUpload}>
                        <input
                          type="file"
                          multiple
                          onChange={e => handlePortfolioUpload(Array.from(e.target.files))}
                          disabled={submitting === selectedDrop._id}
                        />
                        <p>Drag files here or click to upload</p>
                      </div>
                      
                      {portfolioFiles.length > 0 && (
                        <div className={styles.uploadedFiles}>
                          {portfolioFiles.map((file, idx) => (
                            <div key={idx} className={styles.uploadedFile}>
                              <span>📄 {file.filename}</span>
                              <button
                                type="button"
                                onClick={() => removePortfolioFile(idx)}
                                className={styles.removeFile}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label>Additional Notes (Optional)</label>
                      <textarea
                        className={styles.textareaField}
                        value={portfolioNotes}
                        onChange={e => setPortfolioNotes(e.target.value)}
                        placeholder="Tell the curators why your work is perfect for this drop..."
                        rows={4}
                      />
                    </div>

                    <button
                      className={styles.submitButton}
                      onClick={() => handleSubmitToDrop(selectedDrop._id)}
                      disabled={submitting === selectedDrop._id || portfolioFiles.length === 0}
                    >
                      {submitting === selectedDrop._id ? 'Submitting...' : 'Submit to Drop'}
                    </button>
                  </>
                ) : (
                  <>
                    <h3>Your Submission</h3>
                    <div 
                      className={styles.submissionStatus}
                      style={{ backgroundColor: getStatusColor(getSubmissionStatus(selectedDrop._id)) }}
                    >
                      <p className={styles.statusText}>{getStatusLabel(getSubmissionStatus(selectedDrop._id))}</p>
                      {submissions[selectedDrop._id]?.submittedAt && (
                        <p className={styles.submittedDate}>
                          Submitted {new Date(submissions[selectedDrop._id].submittedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {submissions[selectedDrop._id]?.portfolio && (
                      <div>
                        <label>Your Portfolio</label>
                        <div className={styles.portfolioList}>
                          {submissions[selectedDrop._id].portfolio.map((file, idx) => (
                            <a 
                              key={idx}
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={styles.portfolioFile}
                            >
                              📎 {file.filename}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {submissions[selectedDrop._id]?.notes && (
                      <div>
                        <label>Your Notes</label>
                        <p>{submissions[selectedDrop._id].notes}</p>
                      </div>
                    )}

                    {['open', 'in-review'].includes(selectedDrop.status) && (
                      <button
                        className={styles.withdrawButton}
                        onClick={() => handleWithdrawSubmission(selectedDrop._id)}
                        disabled={submitting === selectedDrop._id}
                      >
                        Withdraw Submission
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
