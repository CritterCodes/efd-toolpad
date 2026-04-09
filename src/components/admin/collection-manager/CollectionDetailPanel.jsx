import React from 'react';
import styles from '../CollectionManager.module.css';

export default function CollectionDetailPanel({ 
  selectedCollection, 
  setSelectedCollection, 
  handlePublishCollection, 
  handleDeleteCollection,
  canDeleteAll,
  session
}) {
  if (!selectedCollection) return null;

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <h3>{selectedCollection.name}</h3>
        <button 
          className={styles.closeBtn}
          onClick={() => setSelectedCollection(null)}
        >
          ✕
        </button>
      </div>

      <div className={styles.detailContent}>
        {selectedCollection.featuredImage && (
          <div className={styles.detailImage}>
            <img src={selectedCollection.featuredImage} alt={selectedCollection.name} />
          </div>
        )}

        <div className={styles.detailInfo}>
          <p><strong>Type:</strong> {selectedCollection.type}</p>
          <p><strong>Status:</strong> {selectedCollection.published ? 'Published' : 'Draft'}</p>
          <p><strong>Visibility:</strong> {selectedCollection.visibility}</p>
          <p><strong>Items:</strong> {selectedCollection.products?.length || 0}</p>
          {selectedCollection.description && (
            <p><strong>Description:</strong> {selectedCollection.description}</p>
          )}
        </div>

        {selectedCollection.products && selectedCollection.products.length > 0 && (
          <div className={styles.productsList}>
            <h4>Products in Collection</h4>
            <ul>
              {selectedCollection.products.map(product => (
                <li key={product}>{product}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.detailActions}>
          {!selectedCollection.published && (
            <button
              className={`${styles.btn} ${styles.publish}`}
              onClick={() => handlePublishCollection(selectedCollection._id)}
            >
              Publish Collection
            </button>
          )}
          {(canDeleteAll || selectedCollection.createdBy === session?.user?.userID) && (
            <button
              className={`${styles.btn} ${styles.delete}`}
              onClick={() => handleDeleteCollection(selectedCollection._id)}
            >
              Delete Collection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}