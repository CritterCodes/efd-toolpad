import React from 'react';
import Image from 'next/image';
import styles from '@/components/artisan/ArtisanProductManager.module.css';

export default function ProductCreateModal({
  setShowCreateModal,
  editingProduct,
  formData,
  setFormData,
  handleSaveProduct,
  handleImageUpload,
  uploadingImages,
  removeImage,
  loading
}) {
  return (
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
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Rose Gold Diamond Ring"
                required
              />
            </div>

            <div>
              <label>Category *</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
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
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label>Description *</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
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
                    gemstone: { ...formData.gemstone, type: e.target.value }
                  })}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Weight (g)"
                  value={formData.gemstone.weight}
                  onChange={e => setFormData({
                    ...formData,
                    gemstone: { ...formData.gemstone, weight: e.target.value }
                  })}
                />
                <input
                  type="text"
                  placeholder="Color"
                  value={formData.gemstone.color}
                  onChange={e => setFormData({
                    ...formData,
                    gemstone: { ...formData.gemstone, color: e.target.value }
                  })}
                />
                <input
                  type="text"
                  placeholder="Clarity"
                  value={formData.gemstone.clarity}
                  onChange={e => setFormData({
                    ...formData,
                    gemstone: { ...formData.gemstone, clarity: e.target.value }
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
  );
}
