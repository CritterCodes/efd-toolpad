import React from 'react';
import styles from '../ArtisanDropParticipation.module.css';
import { getStatusColor, getStatusLabel } from './DropStatusHelpers';

export default function DropGrid({ drops, getSubmissionStatus, onSelectDrop }) {
  if (drops.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>🎨 No drops available for your specialties right now</p>
        <p className={styles.hint}>Complete your artisan profile to unlock more opportunities</p>
      </div>
    );
  }

  return (
    <div className={styles.dropGrid}>
      {drops.map(drop => {
        const submissionStatus = getSubmissionStatus(drop._id);
        const isSubmitted = submissionStatus !== 'not-submitted';
        
        return (
          <div 
            key={drop._id}
            className={styles.dropCard}
            onClick={() => onSelectDrop(drop)}
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
  );
}
