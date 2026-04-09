import React from 'react';
import { COLLECTION_TYPES } from '@/constants/roles';
import styles from '../CollectionManager.module.css';

export default function CollectionFilterBar({ filter, setFilter, visibleCollections }) {
  return (
    <div className={styles.filterBar}>
      <button 
        className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
        onClick={() => setFilter('all')}
      >
        All ({visibleCollections.length})
      </button>
      <button 
        className={`${styles.filterBtn} ${filter === COLLECTION_TYPES.ARTISAN ? styles.active : ''}`}
        onClick={() => setFilter(COLLECTION_TYPES.ARTISAN)}
      >
        Artisan
      </button>
      <button 
        className={`${styles.filterBtn} ${filter === COLLECTION_TYPES.CURATED ? styles.active : ''}`}
        onClick={() => setFilter(COLLECTION_TYPES.CURATED)}
      >
        Curated
      </button>
      <button 
        className={`${styles.filterBtn} ${filter === COLLECTION_TYPES.SEASONAL ? styles.active : ''}`}
        onClick={() => setFilter(COLLECTION_TYPES.SEASONAL)}
      >
        Seasonal
      </button>
    </div>
  );
}