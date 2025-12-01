'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import styles from './ArtisanProductManager.module.css';

/**
 * ArtisanProductManager Component
 * Allows artisans to:
 * - View all their products with status (draft, pending-approval, approved, published, rejected, archived)
 * - Create new products by uploading images and metadata
 * - Edit draft products
 * - Delete their own products
 * - View feedback from admin rejections/revisions
 * - Resubmit rejected products
 */
export default function ArtisanProductManager() {
  const { data: session } = useSession();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'jewelry',
    gemstone: {
      type: '',
      weight: '',
      caratage: '',
      color: '',
      clarity: ''
    },
    materials: [],
    price: '',
    images: [],
    tags: []
  });
  const [uploadingImages, setUploadingImages] = useState(false);

  // Fetch artisan's products
  useEffect(() => {
    if (!session?.user?.id) return;
    fetchProducts();
  }, [session]);

  async function fetchProducts() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/artisan/products?userId=${session.user.id}`);
      
      if (!res.ok) throw new Error(`Failed to fetch products: ${res.statusText}`);
      
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle image upload
  async function handleImageUpload(files) {
    try {
      setUploadingImages(true);
      const uploadedImages = [];
      
      for (const file of files) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload
        });
        
        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
        
        const data = await res.json();
        uploadedImages.push({
          url: data.url,
          thumbnail: data.thumbnail,
          filename: data.filename
        });
      }
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedImages]
      }));
    } catch (err) {
      console.error('Error uploading images:', err);
      setError(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingImages(false);
    }
  }

  // Remove image from form
  function removeImage(index) {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  }

  // Handle create/update product
  async function handleSaveProduct(e) {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      setError('Title and description are required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const url = editingProduct 
        ? `/api/artisan/products/${editingProduct._id}`
        : '/api/artisan/products/submit';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        userId: session.user.id,
        artisanId: session.user.artisanId
      };
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error(`Save failed: ${res.statusText}`);
      
      const data = await res.json();
      
      if (editingProduct) {
        // Update existing product in list
        setProducts(products.map(p => p._id === editingProduct._id ? data.product : p));
      } else {
        // Add new product to list
        setProducts([...products, data.product]);
      }
      
      // Reset form
      setFormData({
        title: '', description: '', category: 'jewelry',
        gemstone: { type: '', weight: '', caratage: '', color: '', clarity: '' },
        materials: [], price: '', images: [], tags: []
      });
      setEditingProduct(null);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle delete product
  async function handleDeleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/artisan/products/${productId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) throw new Error(`Delete failed: ${res.statusText}`);
      
      setProducts(products.filter(p => p._id !== productId));
      setShowDetailModal(false);
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle resubmit rejected product
  async function handleResubmitProduct(productId) {
    try {
      setLoading(true);
      const res = await fetch(`/api/artisan/products/${productId}/resubmit`, {
        method: 'POST'
      });
      
      if (!res.ok) throw new Error(`Resubmit failed: ${res.statusText}`);
      
      const data = await res.json();
      setProducts(products.map(p => p._id === productId ? data.product : p));
      setShowDetailModal(false);
    } catch (err) {
      console.error('Error resubmitting product:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle submit product
  async function handleSubmitProduct(productId) {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}/submit`, {
        method: 'POST'
      });
      
      if (!res.ok) throw new Error(`Submit failed: ${res.statusText}`);
      
      const data = await res.json();
      setProducts(products.map(p => p._id === productId ? data.product : p));
      setSelectedProduct(data.product);
    } catch (err) {
      console.error('Error submitting product:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle unpublish/archive product
  async function handleUnpublishProduct(productId, targetStatus = 'draft') {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}/unpublish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus })
      });
      
      if (!res.ok) throw new Error(`Unpublish failed: ${res.statusText}`);
      
      const data = await res.json();
      setProducts(products.map(p => p._id === productId ? data.product : p));
      setSelectedProduct(data.product);
    } catch (err) {
      console.error('Error unpublishing product:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Filter products by status
  const filteredProducts = filterStatus === 'all' 
    ? products 
    : products.filter(p => p.status === filterStatus);

  // Status color mapping
  const getStatusColor = (status) => {
    const colors = {
      'draft': '#94a3b8',
      'pending-approval': '#eab308',
      'approved': '#22c55e',
      'published': '#0ea5e9',
      'revision-requested': '#f97316',
      'rejected': '#ef4444',
      'archived': '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'draft': 'Draft',
      'pending-approval': 'Pending Review',
      'approved': 'Approved',
      'published': 'Published',
      'revision-requested': 'Revision Needed',
      'rejected': 'Rejected',
      'archived': 'Archived'
    };
    return labels[status] || status;
  };

  if (!session?.user?.id) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <p>Please log in to manage your products</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>My Products</h1>
          <p className={styles.subtitle}>Manage your product submissions and gallery</p>
        </div>
        <button 
          className={styles.createButton}
          onClick={() => {
            setEditingProduct(null);
            setFormData({
              title: '', description: '', category: 'jewelry',
              gemstone: { type: '', weight: '', caratage: '', color: '', clarity: '' },
              materials: [], price: '', images: [], tags: []
            });
            setShowCreateModal(true);
          }}
        >
          + New Product
        </button>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Status Filters */}
      <div className={styles.filterBar}>
        {['all', 'draft', 'pending-approval', 'approved', 'published', 'rejected'].map(status => (
          <button
            key={status}
            className={`${styles.filterButton} ${filterStatus === status ? styles.active : ''}`}
            onClick={() => setFilterStatus(status)}
          >
            {getStatusLabel(status)}
            <span className={styles.count}>
              {status === 'all' ? products.length : products.filter(p => p.status === status).length}
            </span>
          </button>
        ))}
      </div>

      {loading && <div className={styles.loading}>Loading products...</div>}

      {!loading && filteredProducts.length === 0 && (
        <div className={styles.emptyState}>
          <p>No products {filterStatus !== 'all' ? `with status "${getStatusLabel(filterStatus)}"` : 'yet'}</p>
          <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
            Create Your First Product
          </button>
        </div>
      )}

      {!loading && filteredProducts.length > 0 && (
        <div className={styles.productGrid}>
          {filteredProducts.map(product => (
            <div 
              key={product._id} 
              className={styles.productCard}
              onClick={() => {
                setSelectedProduct(product);
                setShowDetailModal(true);
              }}
            >
              <div className={styles.imageContainer}>
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={product.images[0].thumbnail || product.images[0].url}
                    alt={product.title}
                    fill
                    className={styles.productImage}
                  />
                ) : (
                  <div className={styles.noImage}>No Image</div>
                )}
                <div 
                  className={styles.statusBadge}
                  style={{ backgroundColor: getStatusColor(product.status) }}
                >
                  {getStatusLabel(product.status)}
                </div>
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.productTitle}>{product.title}</h3>
                <p className={styles.productCategory}>{product.category}</p>
                <p className={styles.productPrice}>${parseFloat(product.price).toFixed(2)}</p>
                <div className={styles.cardMeta}>
                  <span>{new Date(product.createdAt).toLocaleDateString()}</span>
                  <span>{product.images?.length || 0} photos</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedProduct && (
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
                          onClick={() => {
                            setEditingProduct(selectedProduct);
                            setFormData({
                              title: selectedProduct.title,
                              description: selectedProduct.description,
                              category: selectedProduct.category,
                              gemstone: selectedProduct.gemstone || { type: '', weight: '', caratage: '', color: '', clarity: '' },
                              materials: selectedProduct.materials || [],
                              price: selectedProduct.price,
                              images: selectedProduct.images || [],
                              tags: selectedProduct.tags || []
                            });
                            setShowDetailModal(false);
                            setShowCreateModal(true);
                          }}
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
                          onClick={() => {
                            setEditingProduct(selectedProduct);
                            setFormData({
                              title: selectedProduct.title,
                              description: selectedProduct.description,
                              category: selectedProduct.category,
                              gemstone: selectedProduct.gemstone || { type: '', weight: '', caratage: '', color: '', clarity: '' },
                              materials: selectedProduct.materials || [],
                              price: selectedProduct.price,
                              images: selectedProduct.images || [],
                              tags: selectedProduct.tags || []
                            });
                            setShowDetailModal(false);
                            setShowCreateModal(true);
                          }}
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
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={() => setShowCreateModal(false)}>✕</button>
            
            <h2>{editingProduct ? 'Edit Product' : 'Create New Product'}</h2>
            
            <form onSubmit={handleSaveProduct} className={styles.form}>
              <div className={styles.formGrid}>
                <div>
                  <label>Product Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g., Rose Gold Diamond Ring"
                    required
                  />
                </div>
                
                <div>
                  <label>Category *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="jewelry">Jewelry</option>
                    <option value="gemstone">Gemstone</option>
                    <option value="custom">Custom Design</option>
                    <option value="repair">Repair</option>
                  </select>
                </div>
                
                <div>
                  <label>Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe your product, materials, craftsmanship, etc."
                  rows={5}
                  required
                />
              </div>

              {formData.category === 'gemstone' && (
                <div className={styles.gemstoneForm}>
                  <h3>Gemstone Details</h3>
                  <div className={styles.formGrid}>
                    <input
                      type="text"
                      placeholder="Type (e.g., Diamond)"
                      value={formData.gemstone.type}
                      onChange={e => setFormData({
                        ...formData,
                        gemstone: {...formData.gemstone, type: e.target.value}
                      })}
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Weight (g)"
                      value={formData.gemstone.weight}
                      onChange={e => setFormData({
                        ...formData,
                        gemstone: {...formData.gemstone, weight: e.target.value}
                      })}
                    />
                    <input
                      type="text"
                      placeholder="Color"
                      value={formData.gemstone.color}
                      onChange={e => setFormData({
                        ...formData,
                        gemstone: {...formData.gemstone, color: e.target.value}
                      })}
                    />
                    <input
                      type="text"
                      placeholder="Clarity"
                      value={formData.gemstone.clarity}
                      onChange={e => setFormData({
                        ...formData,
                        gemstone: {...formData.gemstone, clarity: e.target.value}
                      })}
                    />
                  </div>
                </div>
              )}

              <div>
                <label>Images</label>
                <div className={styles.imageUpload}>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => handleImageUpload(Array.from(e.target.files))}
                    disabled={uploadingImages}
                  />
                  {uploadingImages && <p>Uploading images...</p>}
                </div>
                
                {formData.images.length > 0 && (
                  <div className={styles.uploadedImages}>
                    {formData.images.map((img, idx) => (
                      <div key={idx} className={styles.uploadedImage}>
                        <Image
                          src={img.thumbnail || img.url}
                          alt={`Product ${idx + 1}`}
                          width={100}
                          height={100}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className={styles.removeImage}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.formActions}>
                <button 
                  type="button" 
                  className={styles.cancelButton}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Save as Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
