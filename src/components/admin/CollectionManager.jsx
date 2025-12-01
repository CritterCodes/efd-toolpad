'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { COLLECTION_TYPES, canUserDoAction } from '@/constants/roles';
import styles from './CollectionManager.module.css';

export default function CollectionManager() {
  const { data: session } = useSession();
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: COLLECTION_TYPES.ARTISAN,
    visibility: 'public'
  });

  // Fetch collections and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch collections
        const collRes = await fetch('/api/collections');
        if (!collRes.ok) throw new Error('Failed to fetch collections');
        const collData = await collRes.json();
        setCollections(collData.collections || []);

        // Fetch available products
        const prodRes = await fetch('/api/products?status=published');
        if (!prodRes.ok) throw new Error('Failed to fetch products');
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchData();
    }
  }, [session]);

  // Filter collections based on user role
  const getVisibleCollections = () => {
    let filtered = collections;

    if (session?.user?.role === 'artisan' || session?.user?.role === 'senior-artisan') {
      // Artisans only see their own collections
      filtered = filtered.filter(c => c.createdBy === session.user.userID);
    } else if (session?.user?.role === 'wholesaler') {
      // Wholesalers see all published collections
      filtered = filtered.filter(c => c.visibility === 'public');
    }

    // Apply additional filter
    if (filter !== 'all') {
      filtered = filtered.filter(c => c.type === filter);
    }

    return filtered;
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to create collection');
      const newCollection = await response.json();
      setCollections([...collections, newCollection.collection]);
      setFormData({
        name: '',
        description: '',
        type: COLLECTION_TYPES.ARTISAN,
        visibility: 'public'
      });
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCollection = async (collectionId) => {
    if (!window.confirm('Are you sure you want to delete this collection?')) return;
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete collection');
      setCollections(collections.filter(c => c._id !== collectionId));
      setSelectedCollection(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePublishCollection = async (collectionId) => {
    try {
      const response = await fetch(`/api/collections/${collectionId}/publish`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to publish collection');
      const updated = await response.json();
      setCollections(collections.map(c => 
        c._id === collectionId ? updated.collection : c
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const canCreate = canUserDoAction(session?.user?.role, 'canCreateCollections');
  const canDeleteAll = canUserDoAction(session?.user?.role, 'canDeleteCollections');
  const visibleCollections = getVisibleCollections();

  return (
    <div className={styles.container}>
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

      {error && <div className={styles.error}>{error}</div>}

      {showForm && canCreate && (
        <form className={styles.form} onSubmit={handleCreateCollection}>
          <h3>Create New Collection</h3>
          
          <div className={styles.formGroup}>
            <label>Collection Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              placeholder="e.g., Summer Gemstones"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe this collection..."
              rows="3"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value={COLLECTION_TYPES.ARTISAN}>Artisan</option>
                <option value={COLLECTION_TYPES.CURATED}>Curated</option>
                <option value={COLLECTION_TYPES.SEASONAL}>Seasonal</option>
                {session?.user?.role === 'admin' && (
                  <option value={COLLECTION_TYPES.DROP}>Drop</option>
                )}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Visibility</label>
              <select
                value={formData.visibility}
                onChange={(e) => setFormData({...formData, visibility: e.target.value})}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="artisans">Artisans Only</option>
              </select>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitBtn}>Create Collection</button>
            <button 
              type="button" 
              className={styles.cancelBtn}
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

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

      {selectedCollection && (
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
      )}
    </div>
  );
}
