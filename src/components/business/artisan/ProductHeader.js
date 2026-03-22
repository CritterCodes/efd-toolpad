import React from 'react';
import styles from '@/components/artisan/ArtisanProductManager.module.css';

export default function ProductHeader({ openCreateModal }) {
  return (
    <div className={styles.header}>
      <div>
        <h1>My Products</h1>
        <p className={styles.subtitle}>Manage your product submissions and gallery</p>
      </div>
      <button className={styles.createButton} onClick={openCreateModal}>
        + New Product
      </button>
    </div>
  );
}
