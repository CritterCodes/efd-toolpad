'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { NOTIFICATION_CHANNELS } from '@/constants/roles';
import styles from './NotificationCenter.module.css';

export default function NotificationCenter() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/notifications');
        if (!response.ok) throw new Error('Failed to fetch notifications');
        const data = await response.json();
        setNotifications(data.notifications || []);
        
        // Count unread
        const unread = (data.notifications || []).filter(n => !n.read).length;
        setUnreadCount(unread);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete notification');
      
      const deleted = notifications.find(n => n._id === notificationId);
      if (deleted && !deleted.read) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
      setNotifications(notifications.filter(n => n._id !== notificationId));
    } catch (err) {
      console.error(err);
    }
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filter === 'important') {
      filtered = filtered.filter(n => n.priority === 'high');
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const getNotificationColor = (channel) => {
    switch (channel) {
      case NOTIFICATION_CHANNELS.EMAIL:
        return styles.email;
      case NOTIFICATION_CHANNELS.IN_APP:
        return styles.inApp;
      case NOTIFICATION_CHANNELS.PUSH:
        return styles.push;
      default:
        return '';
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'product-approved': '✓',
      'product-rejected': '✕',
      'product-revision-request': '↻',
      'product-published': '🚀',
      'drop-request-new': '🎯',
      'artisan-selected-for-drop': '⭐',
      'artisan-not-selected': '💝',
      'order-received': '📦',
      'payment-received': '💰'
    };
    return icons[type] || '📬';
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Notifications</h2>
        <div className={styles.headerActions}>
          <span className={styles.unreadBadge}>{unreadCount} unread</span>
          {unreadCount > 0 && (
            <button 
              className={styles.markAllBtn}
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.filterBar}>
        <button 
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({notifications.length})
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'unread' ? styles.active : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'important' ? styles.active : ''}`}
          onClick={() => setFilter('important')}
        >
          Important
        </button>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className={styles.empty}>
            {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
          </div>
        ) : (
          <div className={styles.list}>
            {filteredNotifications.map(notification => (
              <div 
                key={notification._id}
                className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                onClick={() => !notification.read && handleMarkAsRead(notification._id)}
              >
                <div className={styles.icon}>
                  {getNotificationIcon(notification.type)}
                </div>

                <div className={styles.content_}>
                  <div className={styles.title}>{notification.title}</div>
                  <p className={styles.message}>{notification.message}</p>
                  
                  <div className={styles.meta}>
                    <time>{new Date(notification.createdAt).toLocaleDateString()}</time>
                    {notification.channels && notification.channels.length > 0 && (
                      <div className={styles.channels}>
                        {notification.channels.map(channel => (
                          <span key={channel} className={`${styles.channel} ${getNotificationColor(channel)}`}>
                            {channel.split('-').join(' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {notification.relatedData && (
                    <div className={styles.relatedData}>
                      {notification.relatedData.productTitle && (
                        <p><strong>Product:</strong> {notification.relatedData.productTitle}</p>
                      )}
                      {notification.relatedData.artisanName && (
                        <p><strong>Artisan:</strong> {notification.relatedData.artisanName}</p>
                      )}
                      {notification.relatedData.dropTheme && (
                        <p><strong>Drop:</strong> {notification.relatedData.dropTheme}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className={styles.actions}>
                  <button
                    className={styles.readBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification._id);
                    }}
                    title={notification.read ? 'Mark as unread' : 'Mark as read'}
                  >
                    {notification.read ? '◯' : '●'}
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNotification(notification._id);
                    }}
                    title="Delete notification"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
