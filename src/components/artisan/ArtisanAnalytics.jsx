'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from './ArtisanAnalytics.module.css';

/**
 * ArtisanAnalytics Component
 * Shows artisan performance metrics:
 * - Total products submitted/approved/published
 * - Approval rate (percentage of submissions approved)
 * - Total earnings (from completed sales)
 * - Drop participation stats (dropped participated in vs selected)
 * - Product performance (views, favorites, sales)
 * - Performance trends over time
 */
export default function ArtisanAnalytics() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30days');
  const [selectedMetric, setSelectedMetric] = useState('products');

  // Fetch analytics data
  useEffect(() => {
    if (!session?.user?.id) return;
    fetchAnalytics();
  }, [session, timeRange]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(
        `/api/artisan/analytics?userId=${session.user.id}&range=${timeRange}`
      );
      
      if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.statusText}`);
      
      const data = await res.json();
      setAnalytics(data.analytics || {});
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!session?.user?.id) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <p>Please log in to view your analytics</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading your analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <p>{error}</p>
          <button onClick={() => fetchAnalytics()}>Retry</button>
        </div>
      </div>
    );
  }

  const {
    totalProducts = 0,
    approvedProducts = 0,
    publishedProducts = 0,
    rejectedProducts = 0,
    totalEarnings = 0,
    pendingEarnings = 0,
    dropsParticipated = 0,
    dropsSelected = 0,
    totalViews = 0,
    totalFavorites = 0,
    totalSales = 0,
    conversionRate = 0,
    approvalRate = 0,
    monthlyTrend = [],
    topProducts = []
  } = analytics;

  // Calculate key metrics
  const submissionRate = totalProducts > 0 ? Math.round((approvedProducts / totalProducts) * 100) : 0;
  const dropSelectionRate = dropsParticipated > 0 ? Math.round((dropsSelected / dropsParticipated) * 100) : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Your Analytics</h1>
          <p className={styles.subtitle}>Track your artisan performance and growth</p>
        </div>
        <div className={styles.timeRangeSelector}>
          {['7days', '30days', '90days', 'all'].map(range => (
            <button
              key={range}
              className={`${styles.rangeButton} ${timeRange === range ? styles.active : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range === '7days' ? 'Last 7 days' : 
               range === '30days' ? 'Last 30 days' :
               range === '90days' ? 'Last 90 days' :
               'All time'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>📦</div>
          <div>
            <h3>Total Products</h3>
            <p className={styles.metricValue}>{totalProducts}</p>
            <p className={styles.metricLabel}>Submissions</p>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>✅</div>
          <div>
            <h3>Approved</h3>
            <p className={styles.metricValue}>{approvedProducts}</p>
            <p className={styles.metricLabel}>{submissionRate}% acceptance</p>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>🌟</div>
          <div>
            <h3>Published</h3>
            <p className={styles.metricValue}>{publishedProducts}</p>
            <p className={styles.metricLabel}>Live in gallery</p>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>💰</div>
          <div>
            <h3>Total Earnings</h3>
            <p className={styles.metricValue}>${totalEarnings.toFixed(2)}</p>
            <p className={styles.metricLabel}>${pendingEarnings.toFixed(2)} pending</p>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>👀</div>
          <div>
            <h3>Views</h3>
            <p className={styles.metricValue}>{totalViews.toLocaleString()}</p>
            <p className={styles.metricLabel}>Product views</p>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>❤️</div>
          <div>
            <h3>Favorites</h3>
            <p className={styles.metricValue}>{totalFavorites.toLocaleString()}</p>
            <p className={styles.metricLabel}>{totalViews > 0 ? Math.round((totalFavorites / totalViews) * 100) : 0}% of views</p>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>🎯</div>
          <div>
            <h3>Sales</h3>
            <p className={styles.metricValue}>{totalSales}</p>
            <p className={styles.metricLabel}>{conversionRate.toFixed(1)}% conversion</p>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>🏆</div>
          <div>
            <h3>Drop Rate</h3>
            <p className={styles.metricValue}>{dropSelectionRate}%</p>
            <p className={styles.metricLabel}>{dropsSelected}/{dropsParticipated} selected</p>
          </div>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className={styles.sectionsGrid}>
        {/* Product Performance */}
        <div className={styles.section}>
          <h2>Product Submission Status</h2>
          <div className={styles.statusBreakdown}>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>
                <span className={styles.dot} style={{ backgroundColor: '#eab308' }}></span>
                Pending
              </div>
              <p className={styles.statusCount}>{totalProducts - approvedProducts - rejectedProducts}</p>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>
                <span className={styles.dot} style={{ backgroundColor: '#10b981' }}></span>
                Approved
              </div>
              <p className={styles.statusCount}>{approvedProducts}</p>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>
                <span className={styles.dot} style={{ backgroundColor: '#ef4444' }}></span>
                Rejected
              </div>
              <p className={styles.statusCount}>{rejectedProducts}</p>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>
                <span className={styles.dot} style={{ backgroundColor: '#0ea5e9' }}></span>
                Published
              </div>
              <p className={styles.statusCount}>{publishedProducts}</p>
            </div>
          </div>

          <div className={styles.progressBar}>
            <div 
              className={styles.progressSegment}
              style={{ 
                width: `${(totalProducts - approvedProducts - rejectedProducts) / totalProducts * 100 || 0}%`,
                backgroundColor: '#eab308'
              }}
            ></div>
            <div 
              className={styles.progressSegment}
              style={{ 
                width: `${(approvedProducts - publishedProducts) / totalProducts * 100 || 0}%`,
                backgroundColor: '#10b981'
              }}
            ></div>
            <div 
              className={styles.progressSegment}
              style={{ 
                width: `${rejectedProducts / totalProducts * 100 || 0}%`,
                backgroundColor: '#ef4444'
              }}
            ></div>
            <div 
              className={styles.progressSegment}
              style={{ 
                width: `${publishedProducts / totalProducts * 100 || 0}%`,
                backgroundColor: '#0ea5e9'
              }}
            ></div>
          </div>
        </div>

        {/* Top Products */}
        {topProducts && topProducts.length > 0 && (
          <div className={styles.section}>
            <h2>Top Performing Products</h2>
            <div className={styles.topProductsList}>
              {topProducts.slice(0, 5).map((product, idx) => (
                <div key={idx} className={styles.topProductItem}>
                  <div className={styles.rank}>{idx + 1}</div>
                  <div className={styles.productInfo}>
                    <p className={styles.productName}>{product.title}</p>
                    <p className={styles.productStats}>
                      {product.views} views • {product.favorites} favorites • {product.sales} sales
                    </p>
                  </div>
                  <p className={styles.productEarnings}>${product.earnings.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Monthly Trend Chart (Text-based) */}
      {monthlyTrend && monthlyTrend.length > 0 && (
        <div className={styles.section}>
          <h2>Submission Trend</h2>
          <div className={styles.trendChart}>
            {monthlyTrend.slice(-12).map((month, idx) => (
              <div key={idx} className={styles.trendBar}>
                <div className={styles.barContainer}>
                  <div 
                    className={styles.bar}
                    style={{ height: `${(month.count / Math.max(...monthlyTrend.map(m => m.count)) || 1) * 100}%` }}
                  ></div>
                </div>
                <p className={styles.barLabel}>{month.month.substring(0, 3)}</p>
                <p className={styles.barValue}>{month.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievement Summary */}
      <div className={styles.section}>
        <h2>Achievement Summary</h2>
        <div className={styles.achievementGrid}>
          <div className={styles.achievement}>
            <div className={styles.achievementIcon}>🌟</div>
            <h3>Approval Rate</h3>
            <p className={styles.achievementValue}>{submissionRate}%</p>
            <p className={styles.achievementDesc}>Of your submissions approved</p>
          </div>
          <div className={styles.achievement}>
            <div className={styles.achievementIcon}>💎</div>
            <h3>Top Products</h3>
            <p className={styles.achievementValue}>{topProducts?.length || 0}</p>
            <p className={styles.achievementDesc}>With 100+ views</p>
          </div>
          <div className={styles.achievement}>
            <div className={styles.achievementIcon}>🎨</div>
            <h3>Active Drops</h3>
            <p className={styles.achievementValue}>{dropsSelected}</p>
            <p className={styles.achievementDesc}>Drop selections</p>
          </div>
          <div className={styles.achievement}>
            <div className={styles.achievementIcon}>🚀</div>
            <h3>Engagement</h3>
            <p className={styles.achievementValue}>{Math.round((totalFavorites / Math.max(totalViews, 1)) * 100)}%</p>
            <p className={styles.achievementDesc}>Favorite rate</p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className={styles.recommendationsBox}>
        <h3>💡 Tips to Improve</h3>
        <ul>
          {submissionRate < 50 && (
            <li>Your approval rate is below average. Focus on high-quality photos and detailed descriptions.</li>
          )}
          {publishedProducts < totalProducts * 0.5 && (
            <li>Many of your approved products aren't published yet. Check for any missing information and publish them.</li>
          )}
          {dropsSelected === 0 && (
            <li>You haven't been selected for any drops yet. Consider applying to more drops that match your specialty.</li>
          )}
          {totalFavorites < totalViews * 0.1 && (
            <li>Your products aren't getting enough favorites. Try updating product descriptions and adding more details.</li>
          )}
          {publishedProducts > 0 && (
            <li>Great work! Keep publishing quality products and engage with customers through feedback.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
