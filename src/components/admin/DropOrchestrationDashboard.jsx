'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DROP_STATUSES, canUserDoAction } from '@/constants/roles';
import styles from './DropOrchestrationDashboard.module.css';

export default function DropOrchestrationDashboard() {
  const { data: session } = useSession();
  const [drops, setDrops] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedDrop, setSelectedDrop] = useState(null);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({
    theme: '',
    description: '',
    briefing: '',
    startDate: '',
    endDate: '',
    targetArtisans: 'all'
  });

  // Fetch drops and collections
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const dropsRes = await fetch('/api/drop-requests');
        if (!dropsRes.ok) throw new Error('Failed to fetch drops');
        const dropsData = await dropsRes.json();
        setDrops(dropsData.drops || []);

        const collRes = await fetch('/api/collections');
        if (!collRes.ok) throw new Error('Failed to fetch collections');
        const collData = await collRes.json();
        setCollections(collData.collections || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.role === 'admin') {
      fetchData();
    }
  }, [session]);

  const handleCreateDrop = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/drop-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to create drop');
      const newDrop = await response.json();
      setDrops([...drops, newDrop.dropRequest]);
      setFormData({
        theme: '',
        description: '',
        briefing: '',
        startDate: '',
        endDate: '',
        targetArtisans: 'all'
      });
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePublishDrop = async (dropId) => {
    try {
      const response = await fetch(`/api/drop-requests/${dropId}/publish`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to publish drop');
      const updated = await response.json();
      setDrops(drops.map(d => d._id === dropId ? updated.dropRequest : d));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCloseDrop = async (dropId) => {
    try {
      const response = await fetch(`/api/drop-requests/${dropId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: DROP_STATUSES.CLOSED })
      });
      if (!response.ok) throw new Error('Failed to close drop');
      const updated = await response.json();
      setDrops(drops.map(d => d._id === dropId ? updated.dropRequest : d));
    } catch (err) {
      setError(err.message);
    }
  };

  const getFilteredDrops = () => {
    let filtered = drops;
    if (filter !== 'all') {
      filtered = filtered.filter(d => d.status === filter);
    }
    return filtered;
  };

  const canManageDrops = canUserDoAction(session?.user?.role, 'canManageDrops');
  const filteredDrops = getFilteredDrops();

  if (session?.user?.role !== 'admin') {
    return <div className={styles.unauthorized}>You do not have permission to manage drops.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Drop Orchestration</h2>
        {canManageDrops && (
          <button 
            className={styles.createBtn}
            onClick={() => setShowForm(!showForm)}
          >
            + New Drop
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {showForm && canManageDrops && (
        <form className={styles.form} onSubmit={handleCreateDrop}>
          <h3>Create New Drop</h3>
          
          <div className={styles.formGroup}>
            <label>Drop Theme *</label>
            <input
              type="text"
              value={formData.theme}
              onChange={(e) => setFormData({...formData, theme: e.target.value})}
              required
              placeholder="e.g., Summer Emeralds 2025"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Public description for the drop..."
              rows="3"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Artisan Briefing</label>
            <textarea
              value={formData.briefing}
              onChange={(e) => setFormData({...formData, briefing: e.target.value})}
              placeholder="Instructions and details for participating artisans..."
              rows="4"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Start Date</label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label>End Date</label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Target Artisans</label>
            <select
              value={formData.targetArtisans}
              onChange={(e) => setFormData({...formData, targetArtisans: e.target.value})}
            >
              <option value="all">All Artisans</option>
              <option value="jewelry">Jewelry Specialists</option>
              <option value="gemstone">Gemstone Specialists</option>
              <option value="custom-design">Custom Design Specialists</option>
            </select>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitBtn}>Create Drop</button>
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
          All ({filteredDrops.length})
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === DROP_STATUSES.DRAFT ? styles.active : ''}`}
          onClick={() => setFilter(DROP_STATUSES.DRAFT)}
        >
          Draft
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === DROP_STATUSES.OPEN ? styles.active : ''}`}
          onClick={() => setFilter(DROP_STATUSES.OPEN)}
        >
          Open
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === DROP_STATUSES.IN_REVIEW ? styles.active : ''}`}
          onClick={() => setFilter(DROP_STATUSES.IN_REVIEW)}
        >
          In Review
        </button>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>Loading drops...</div>
        ) : filteredDrops.length === 0 ? (
          <div className={styles.empty}>
            {canManageDrops ? 'No drops yet. Create your first one!' : 'No drops available'}
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredDrops.map(drop => (
              <div 
                key={drop._id}
                className={`${styles.dropCard} ${selectedDrop?._id === drop._id ? styles.selected : ''}`}
                onClick={() => setSelectedDrop(drop)}
              >
                <div className={styles.statusBadge} data-status={drop.status}>
                  {drop.status.toUpperCase()}
                </div>
                <h4>{drop.theme}</h4>
                <p className={styles.description}>{drop.description}</p>
                <div className={styles.meta}>
                  <span className={styles.submissions}>
                    {drop.submissions?.length || 0} submissions
                  </span>
                  <time>{new Date(drop.createdAt).toLocaleDateString()}</time>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedDrop && (
        <div className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <h3>{selectedDrop.theme}</h3>
            <button 
              className={styles.closeBtn}
              onClick={() => setSelectedDrop(null)}
            >
              ✕
            </button>
          </div>

          <div className={styles.detailContent}>
            <div className={styles.statusInfo}>
              <span className={styles.statusBadge} data-status={selectedDrop.status}>
                {selectedDrop.status}
              </span>
              <span className={styles.submissionCount}>
                {selectedDrop.submissions?.length || 0} submissions
              </span>
            </div>

            <div className={styles.field}>
              <label>Description</label>
              <p>{selectedDrop.description}</p>
            </div>

            {selectedDrop.briefing && (
              <div className={styles.field}>
                <label>Artisan Briefing</label>
                <p>{selectedDrop.briefing}</p>
              </div>
            )}

            {selectedDrop.startDate && (
              <div className={styles.field}>
                <label>Timeline</label>
                <p>
                  {new Date(selectedDrop.startDate).toLocaleDateString()} - 
                  {new Date(selectedDrop.endDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {selectedDrop.selectedArtisans && selectedDrop.selectedArtisans.length > 0 && (
              <div className={styles.field}>
                <label>Selected Artisans ({selectedDrop.selectedArtisans.length})</label>
                <div className={styles.artisanList}>
                  {selectedDrop.selectedArtisans.map(artisan => (
                    <span key={artisan} className={styles.artisanTag}>✓ {artisan}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedDrop.submissions && selectedDrop.submissions.length > 0 && (
              <div className={styles.field}>
                <label>Recent Submissions</label>
                <div className={styles.submissionsList}>
                  {selectedDrop.submissions.slice(0, 5).map((submission, idx) => (
                    <div key={idx} className={styles.submissionItem}>
                      <span className={styles.artisanName}>{submission.artisanName}</span>
                      <span className={styles.submissionStatus}>{submission.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.actions}>
              {selectedDrop.status === DROP_STATUSES.DRAFT && (
                <button
                  className={`${styles.btn} ${styles.publish}`}
                  onClick={() => handlePublishDrop(selectedDrop._id)}
                >
                  Publish & Open Drop
                </button>
              )}
              {selectedDrop.status === DROP_STATUSES.OPEN && (
                <button
                  className={`${styles.btn} ${styles.close}`}
                  onClick={() => handleCloseDrop(selectedDrop._id)}
                >
                  Close Submissions
                </button>
              )}
              {(selectedDrop.status === DROP_STATUSES.CLOSED || selectedDrop.status === DROP_STATUSES.IN_REVIEW) && (
                <button
                  className={styles.reviewBtn}
                  onClick={() => window.location.href = `/dashboard/admin/drops/${selectedDrop._id}/review`}
                >
                  Review Submissions
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
