'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PRODUCT_STATUSES, STATUS_COLORS } from '@/constants/roles';
import styles from './PendingProductsPanel.module.css';

export default function PendingProductsPanel() {
  const { data: session } = useSession();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [revisionNote, setRevisionNote] = useState('');

  // Fetch pending products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/products?status=pending-approval');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.role === 'admin') {
      fetchProducts();
    }
  }, [session]);

  const handleApprove = async (productId) => {
    try {
      setActionInProgress(productId);
      const response = await fetch(`/api/products/${productId}/approve`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to approve product');
      setProducts(products.filter(p => p._id !== productId));
      setSelectedProduct(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (productId) => {
    try {
      setActionInProgress(productId);
      const response = await fetch(`/api/products/${productId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });
      if (!response.ok) throw new Error('Failed to reject product');
      setProducts(products.filter(p => p._id !== productId));
      setSelectedProduct(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRequestRevision = async (productId) => {
    try {
      setActionInProgress(productId);
      const response = await fetch(`/api/products/${productId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'revision-requested',
          reason: revisionNote
        })
      });
      if (!response.ok) throw new Error('Failed to request revision');
      setProducts(products.filter(p => p._id !== productId));
      setSelectedProduct(null);
      setRevisionNote('');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredProducts = filter === 'all' 
    ? products 
    : products.filter(p => p.productType === filter);

  if (!session?.user?.role === 'admin') {
    return <div className={styles.unauthorized}>You do not have permission to view this section.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Pending Product Approvals</h2>
        <span className={styles.count}>{filteredProducts.length} products</span>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.filterBar}>
        <button 
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({products.length})
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'gemstone' ? styles.active : ''}`}
          onClick={() => setFilter('gemstone')}
        >
          Gemstones
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'jewelry' ? styles.active : ''}`}
          onClick={() => setFilter('jewelry')}
        >
          Jewelry
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'custom' ? styles.active : ''}`}
          onClick={() => setFilter('custom')}
        >
          Custom
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.productsList}>
          {loading ? (
            <div className={styles.loading}>Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className={styles.empty}>No pending products to review</div>
          ) : (
            <div className={styles.grid}>
              {filteredProducts.map(product => (
                <div 
                  key={product._id}
                  className={`${styles.productCard} ${selectedProduct?._id === product._id ? styles.selected : ''}`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className={styles.imageWrapper}>
                    {product.images && product.images[0] && (
                      <img src={product.images[0]} alt={product.title} />
                    )}
                    <span className={styles.typeTag}>{product.productType}</span>
                  </div>
                  <div className={styles.productInfo}>
                    <h4>{product.title}</h4>
                    <p className={styles.artisan}>{product.artisanInfo?.businessName}</p>
                    <p className={styles.description}>{product.description.substring(0, 100)}...</p>
                    <div className={styles.meta}>
                      <span className={styles.status}>{PRODUCT_STATUSES.PENDING_APPROVAL}</span>
                      <time>{new Date(product.createdAt).toLocaleDateString()}</time>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedProduct && (
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <h3>Product Details</h3>
              <button 
                className={styles.closeBtn}
                onClick={() => setSelectedProduct(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.detailContent}>
              {selectedProduct.images && selectedProduct.images[0] && (
                <div className={styles.largeImage}>
                  <img src={selectedProduct.images[0]} alt={selectedProduct.title} />
                </div>
              )}

              <div className={styles.info}>
                <h4>{selectedProduct.title}</h4>
                
                <div className={styles.field}>
                  <label>Artisan</label>
                  <p>{selectedProduct.artisanInfo?.businessName}</p>
                </div>

                <div className={styles.field}>
                  <label>Type</label>
                  <p className={styles.badge}>{selectedProduct.productType}</p>
                </div>

                <div className={styles.field}>
                  <label>Description</label>
                  <p>{selectedProduct.description}</p>
                </div>

                {selectedProduct.gemstoneProperties && (
                  <div className={styles.field}>
                    <label>Gemstone Properties</label>
                    <div className={styles.properties}>
                      <p><strong>Carat:</strong> {selectedProduct.gemstoneProperties.carat}</p>
                      <p><strong>Color:</strong> {selectedProduct.gemstoneProperties.color}</p>
                      <p><strong>Clarity:</strong> {selectedProduct.gemstoneProperties.clarity}</p>
                      <p><strong>Cut:</strong> {selectedProduct.gemstoneProperties.cut}</p>
                    </div>
                  </div>
                )}

                <div className={styles.field}>
                  <label>Submitted</label>
                  <p>{new Date(selectedProduct.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className={styles.actions}>
                <div className={styles.actionGroup}>
                  <button
                    className={`${styles.btn} ${styles.approve}`}
                    onClick={() => handleApprove(selectedProduct._id)}
                    disabled={actionInProgress === selectedProduct._id}
                  >
                    {actionInProgress === selectedProduct._id ? 'Approving...' : '✓ Approve'}
                  </button>
                  <button
                    className={`${styles.btn} ${styles.reject}`}
                    onClick={() => handleReject(selectedProduct._id)}
                    disabled={actionInProgress === selectedProduct._id}
                  >
                    {actionInProgress === selectedProduct._id ? 'Rejecting...' : '✕ Reject'}
                  </button>
                </div>

                <div className={styles.revisionSection}>
                  <label>Request Revision</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Enter revision notes for the artisan..."
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                  />
                  <button
                    className={`${styles.btn} ${styles.revision}`}
                    onClick={() => handleRequestRevision(selectedProduct._id)}
                    disabled={actionInProgress === selectedProduct._id || !revisionNote.trim()}
                  >
                    {actionInProgress === selectedProduct._id ? 'Sending...' : '↻ Request Revision'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
