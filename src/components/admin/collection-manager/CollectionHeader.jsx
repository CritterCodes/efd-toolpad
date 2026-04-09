import React from 'react';
import styles from '../CollectionManager.module.css';

export default function CollectionHeader({ canCreate, showForm, setShowForm }) {
  return (
    <div className={styles.header}>
      <h2>Collections</h2>
      {canCreate && (
        <button 
          className={styles.createBtn}
          onClick={() => setShowForm(!showForm)}
        >
          + New Collection
        </button>
      )}
    </div>
  );
}