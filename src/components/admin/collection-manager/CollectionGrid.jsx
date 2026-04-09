import React from 'react';
import styles from '../CollectionManager.module.css';

export default function CollectionGrid({ 
  loading, 
  visibleCollections, 
  canCreate, 
  selectedCollection, 
  setSelectedCollection 
}) {
  return (
    <div className={styles.content}>
      {loading ? (
        <div className={styles.loading}>Loading collections...</div>
      ) : visibleCollections.length === 0 ? (
        <div className={styles.empty}>
          {canCreate ? 'No collections yet. Create your first one!' : 'No collections available'}
        </div>
      ) : (
        <div className={styles.grid}>
          {visibleCollections.map(collection => (
            <div 
              key={collection._id}
              className={`${styles.collectionCard} ${selectedCollection?._id === collection._id ? styles.selected : ''}`}
              onClick={() => setSelectedCollection(collection)}
            >
              <div className={styles.cardImage}>
                {collection.featuredImage ? (
                  <img src={collection.featuredImage} alt={collection.name} />
                ) : (
                  <div className={styles.placeholder}>📚</div>
                )}
                <span className={styles.typeTag}>{collection.type}</span>
              </div>
              <div className={styles.cardContent}>
                <h4>{collection.name}</h4>
                <p className={styles.description}>{collection.description}</p>
                <div className={styles.cardMeta}>
                  <span className={styles.count}>{collection.products?.length || 0} items</span>
                  <span className={`${styles.status} ${collection.published ? styles.published : ''}`}>
                    {collection.published ? '✓ Published' : 'Draft'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}