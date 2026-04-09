import React from 'react';
import { COLLECTION_TYPES } from '@/constants/roles';
import styles from '../CollectionManager.module.css';

export default function CollectionForm({ 
  formData, 
  setFormData, 
  handleCreateCollection, 
  setShowForm, 
  session 
}) {
  return (
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
  );
}