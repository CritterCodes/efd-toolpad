import React from 'react';
import Image from 'next/image';
import styles from '@/components/artisan/ArtisanProductManager.module.css';

export default function ProductDetailModal({
  selectedProduct,
  setShowDetailModal,
  getStatusColor,
  getStatusLabel,
  handleSubmitProduct,
  openEditModal,
  handleDeleteProduct,
  handleUnpublishProduct,
  handleResubmitProduct
}) {
  if (!selectedProduct) return null;

  return (
    <div className={styles.modal} onClick={() => setShowDetailModal(false)}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={() => setShowDetailModal(false)}>✕</button>
        <div className={styles.detailLayout}>
          <div className={styles.detailImages}>
            {selectedProduct.images && selectedProduct.images.length > 0 ? (
              <>
                <div className={styles.mainImage}>
                  <Image
                    src={selectedProduct.images[0].url}
                    alt={selectedProduct.title}
                    fill
                    className={styles.image}
                  />
                </div>
                {selectedProduct.images.length > 1 && (
                  <div className={styles.thumbnails}>
                    {selectedProduct.images.map((img, idx) => (
                      <Image
                        key={idx}
                        src={img.thumbnail || img.url}
                        alt={`${selectedProduct.title} ${idx + 1}`}
                        width={80}
                        height={80}
                        className={styles.thumbnail}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noImageLarge}>No Images</div>
            )}
          </div>

          <div className={styles.detailInfo}>
            <div className={styles.header}>
              <div>
                <h2>{selectedProduct.title}</h2>
                <div
                  className={styles.statusBadgeLarge}
                  style={{ backgroundColor: getStatusColor(selectedProduct.status) }}
                >
                  {getStatusLabel(selectedProduct.status)}
                </div>
              </div>
            </div>

            <div className={styles.detailGrid}>
              <div>
                <label>Price</label>
                <p className={styles.price}>${parseFloat(selectedProduct.price).toFixed(2)}</p>
              </div>
              <div>
                <label>Category</label>
                <p>{selectedProduct.category}</p>
              </div>
              <div>
                <label>Created</label>
                <p>{new Date(selectedProduct.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <label>Status Updated</label>
                <p>{new Date(selectedProduct.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <label>Description</label>
              <p className={styles.description}>{selectedProduct.description}</p>
            </div>

            {selectedProduct.gemstone && Object.values(selectedProduct.gemstone).some(v => v) && (
              <div className={styles.gemstoneDetails}>
                <label>Gemstone Details</label>
                <div className={styles.detailGrid}>
                  {selectedProduct.gemstone.type && <div><strong>Type:</strong> {selectedProduct.gemstone.type}</div>}
                  {selectedProduct.gemstone.weight && <div><strong>Weight:</strong> {selectedProduct.gemstone.weight}g</div>}
                  {selectedProduct.gemstone.color && <div><strong>Color:</strong> {selectedProduct.gemstone.color}</div>}
                  {selectedProduct.gemstone.clarity && <div><strong>Clarity:</strong> {selectedProduct.gemstone.clarity}</div>}
                </div>
              </div>
            )}

            {selectedProduct.tags && selectedProduct.tags.length > 0 && (
              <div>
                <label>Tags</label>
                <div className={styles.tags}>
                  {selectedProduct.tags.map((tag, idx) => (
                    <span key={idx} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedProduct.revisionNotes && (
              <div className={styles.revisionNotes}>
                <label>📝 Revision Notes from Admin:</label>
                <p>{selectedProduct.revisionNotes}</p>
              </div>
            )}

            <div className={styles.statusManagement}>
              <label>Publishing Status</label>
              <div className={styles.statusControls}>
                {selectedProduct.status === 'draft' && (
                  <div className={styles.actionGroup}>
                    <button
                      className={styles.submitButton}
                      onClick={() => handleSubmitProduct(selectedProduct._id)}
                    >
                      Submit for Review
                    </button>
                    <button
                      className={styles.editButton}
                      onClick={() => openEditModal(selectedProduct)}
                    >
                      Edit Product
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteProduct(selectedProduct._id)}
                    >
                      Delete
                    </button>
                  </div>
                )}

                {selectedProduct.status === 'pending-approval' && (
                  <div className={styles.statusMessage}>
                    <p>⏳ Your product is pending admin review. Check back soon!</p>
                  </div>
                )}

                {selectedProduct.status === 'approved' && (
                  <div className={styles.statusMessage}>
                    <p>✅ Your product has been approved and is ready to publish.</p>
                  </div>
                )}

                {selectedProduct.status === 'published' && (
                  <div className={styles.actionGroup}>
                    <select
                      className={styles.statusDropdown}
                      onChange={(e) => {
                        if (e.target.value === 'draft') {
                          handleUnpublishProduct(selectedProduct._id, 'draft');
                        } else if (e.target.value === 'archived') {
                          handleUnpublishProduct(selectedProduct._id, 'archived');
                        }
                      }}
                      defaultValue="published"
                    >
                      <option value="published">Published (Live)</option>
                      <option value="draft">Move to Draft</option>
                      <option value="archived">Archive Product</option>
                    </select>
                  </div>
                )}

                {selectedProduct.status === 'revision-requested' && (
                  <div className={styles.actionGroup}>
                    <button
                      className={styles.resubmitButton}
                      onClick={() => handleResubmitProduct(selectedProduct._id)}
                    >
                      Resubmit with Changes
                    </button>
                    <button
                      className={styles.editButton}
                      onClick={() => openEditModal(selectedProduct)}
                    >
                      Edit Product
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteProduct(selectedProduct._id)}
                    >
                      Delete
                    </button>
                  </div>
                )}

                {selectedProduct.status === 'rejected' && (
                  <div className={styles.statusMessage}>
                    <p>❌ Your product was not approved. You can delete it or contact support for details.</p>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteProduct(selectedProduct._id)}
                    >
                      Delete
                    </button>
                  </div>
                )}

                {selectedProduct.status === 'archived' && (
                  <div className={styles.statusMessage}>
                    <p>📦 This product is archived. You can republish it by moving back to draft.</p>
                    <select
                      className={styles.statusDropdown}
                      onChange={(e) => {
                        if (e.target.value === 'draft') {
                          handleUnpublishProduct(selectedProduct._id, 'draft');
                        }
                      }}
                      defaultValue="archived"
                    >
                      <option value="archived">Archived</option>
                      <option value="draft">Move to Draft</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
