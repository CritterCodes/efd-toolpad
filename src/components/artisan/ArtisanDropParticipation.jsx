'use client';

import React, { useState } from 'react';
import styles from './ArtisanDropParticipation.module.css';
import { useArtisanDrop } from '@/hooks/artisan/useArtisanDrop';
import DropFilterBar from './drops/DropFilterBar';
import DropGrid from './drops/DropGrid';
import DropDetailModal from './drops/DropDetailModal';

/**
 * ArtisanDropParticipation Component
 * Lightweight orchestrator for artisans to:
 * - Browse available drops
 * - Filter drops by status
 * - View drop details and submit portfolio
 */
export default function ArtisanDropParticipation() {
  const {
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
  } = useArtisanDrop();

  const [selectedDrop, setSelectedDrop] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  if (!session?.user?.id) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <p>Please log in to view drop opportunities</p>
        </div>
      </div>
    );
  }

  const handleSelectDrop = (drop) => {
    setSelectedDrop(drop);
    setShowDetailModal(true);
  };

  const closeModal = () => {
    setShowDetailModal(false);
    setSelectedDrop(null);
  };

  const onSubmitDrop = (dropId) => {
    handleSubmitToDrop(dropId, closeModal);
  };

  const onWithdrawSubmission = (dropId) => {
    handleWithdrawSubmission(dropId, closeModal);
  };

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

      <DropFilterBar 
        drops={drops}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
      />

      {loading && <div className={styles.loading}>Loading drop opportunities...</div>}

      {!loading && (
        <DropGrid 
          drops={drops.filter(d => d.status === filterStatus)}
          getSubmissionStatus={getSubmissionStatus}
          onSelectDrop={handleSelectDrop}
        />
      )}

      {showDetailModal && selectedDrop && (
        <DropDetailModal
          drop={selectedDrop}
          onClose={closeModal}
          submission={submissions[selectedDrop._id]}
          getSubmissionStatus={getSubmissionStatus}
          submitting={submitting}
          portfolioFiles={portfolioFiles}
          handlePortfolioUpload={handlePortfolioUpload}
          removePortfolioFile={removePortfolioFile}
          portfolioNotes={portfolioNotes}
          setPortfolioNotes={setPortfolioNotes}
          handleSubmitToDrop={onSubmitDrop}
          handleWithdrawSubmission={onWithdrawSubmission}
        />
      )}
    </div>
  );
}
