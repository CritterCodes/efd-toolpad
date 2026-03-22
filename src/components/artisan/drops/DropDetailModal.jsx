import React from 'react';
import styles from '../ArtisanDropParticipation.module.css';
import { getStatusColor, getStatusLabel } from './DropStatusHelpers';

export default function DropDetailModal({ 
  drop, 
  onClose, 
  submission,
  getSubmissionStatus,
  submitting,
  portfolioFiles,
  handlePortfolioUpload,
  removePortfolioFile,
  portfolioNotes,
  setPortfolioNotes,
  handleSubmitToDrop,
  handleWithdrawSubmission
}) {
  if (!drop) return null;

  const currentSubmissionStatus = getSubmissionStatus(drop._id);

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>✕</button>
        
        <div className={styles.detailLayout}>
          <div className={styles.detailInfo}>
            <div className={styles.header}>
              <div>
                <h2>{drop.theme}</h2>
                <div 
                  className={styles.statusBadgeLarge}
                  style={{ backgroundColor: getStatusColor(drop.status) }}
                >
                  {getStatusLabel(drop.status)}
                </div>
              </div>
            </div>

            <div className={styles.detailGrid}>
              <div>
                <label>Status</label>
                <p>{getStatusLabel(drop.status)}</p>
              </div>
              <div>
                <label>Start Date</label>
                <p>{new Date(drop.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label>End Date</label>
                <p>{new Date(drop.endDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label>Artisans Selected</label>
                <p>{drop.selectedArtisans?.length || 0}</p>
              </div>
            </div>

            <div>
              <label>Public Description</label>
              <p className={styles.description}>{drop.publicDescription}</p>
            </div>

            <div>
              <label>📋 Artisan Briefing</label>
              <p className={styles.briefing}>{drop.artisanBriefing}</p>
            </div>

            {drop.targetArtisanTypes && drop.targetArtisanTypes.length > 0 && (
              <div>
                <label>Looking For</label>
                <div className={styles.tags}>
                  {drop.targetArtisanTypes.map((type, idx) => (
                    <span key={idx} className={styles.tag}>{type}</span>
                  ))}
                </div>
              </div>
            )}

            {submission?.rejectionReason && (
              <div className={styles.rejectionNotes}>
                <label>💭 Feedback</label>
                <p>{submission.rejectionReason}</p>
              </div>
            )}
          </div>

          {/* Submission Section */}
          <div className={styles.submissionSection}>
            {currentSubmissionStatus === 'not-submitted' ? (
              <>
                <h3>Submit Your Portfolio</h3>
                
                <div className={styles.uploadArea}>
                  <label>Upload Portfolio Files</label>
                  <div className={styles.fileUpload}>
                    <input
                      type="file"
                      multiple
                      onChange={e => handlePortfolioUpload(Array.from(e.target.files))}
                      disabled={submitting === drop._id}
                    />
                    <p>Drag files here or click to upload</p>
                  </div>
                  
                  {portfolioFiles.length > 0 && (
                    <div className={styles.uploadedFiles}>
                      {portfolioFiles.map((file, idx) => (
                        <div key={idx} className={styles.uploadedFile}>
                          <span>📄 {file.filename}</span>
                          <button
                            type="button"
                            onClick={() => removePortfolioFile(idx)}
                            className={styles.removeFile}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label>Additional Notes (Optional)</label>
                  <textarea
                    className={styles.textareaField}
                    value={portfolioNotes}
                    onChange={e => setPortfolioNotes(e.target.value)}
                    placeholder="Tell the curators why your work is perfect for this drop..."
                    rows={4}
                  />
                </div>

                <button
                  className={styles.submitButton}
                  onClick={() => handleSubmitToDrop(drop._id)}
                  disabled={submitting === drop._id || portfolioFiles.length === 0}
                >
                  {submitting === drop._id ? 'Submitting...' : 'Submit to Drop'}
                </button>
              </>
            ) : (
              <>
                <h3>Your Submission</h3>
                <div 
                  className={styles.submissionStatus}
                  style={{ backgroundColor: getStatusColor(currentSubmissionStatus) }}
                >
                  <p className={styles.statusText}>{getStatusLabel(currentSubmissionStatus)}</p>
                  {submission?.submittedAt && (
                    <p className={styles.submittedDate}>
                      Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {submission?.portfolio && (
                  <div>
                    <label>Your Portfolio</label>
                    <div className={styles.portfolioList}>
                      {submission.portfolio.map((file, idx) => (
                        <a 
                          key={idx}
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={styles.portfolioFile}
                        >
                          📎 {file.filename}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {submission?.notes && (
                  <div>
                    <label>Your Notes</label>
                    <p>{submission.notes}</p>
                  </div>
                )}

                {['open', 'in-review'].includes(drop.status) && (
                  <button
                    className={styles.withdrawButton}
                    onClick={() => handleWithdrawSubmission(drop._id)}
                    disabled={submitting === drop._id}
                  >
                    Withdraw Submission
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
