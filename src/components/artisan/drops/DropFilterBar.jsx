import React from 'react';
import styles from '../ArtisanDropParticipation.module.css';
import { getStatusLabel } from './DropStatusHelpers';

export default function DropFilterBar({ drops, filterStatus, setFilterStatus }) {
  return (
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
  );
}
