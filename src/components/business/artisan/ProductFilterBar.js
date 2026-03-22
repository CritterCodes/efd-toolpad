import React from 'react';
import styles from '@/components/artisan/ArtisanProductManager.module.css';

export default function ProductFilterBar({
  filterStatus,
  setFilterStatus,
  products,
  getStatusLabel
}) {
  const statuses = ['all', 'draft', 'pending-approval', 'approved', 'published', 'rejected'];

  return (
    <div className={styles.filterBar}>
      {statuses.map(status => (
        <button
          key={status}
          className={`${styles.filterButton} ${filterStatus === status ? styles.active : ''}`}
          onClick={() => setFilterStatus(status)}
        >
          {getStatusLabel(status)}
          <span className={styles.count}>
            {status === 'all'
              ? products.length
              : products.filter(p => p.status === status).length}
          </span>
        </button>
      ))}
    </div>
  );
}
