'use client';

import { useState, useEffect } from 'react';
import { 
  IconButton, 
  Badge, 
  Menu, 
  MenuItem, 
  Typography, 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  Divider,
  Button,
  CircularProgress
} from '@mui/material';
import { Notifications as NotificationsIcon, Circle as CircleIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const open = Boolean(anchorEl);

  const fetchNotifications = async () => {
    if (!session?.user) return;
    
    try {
      // Don't set loading on background refreshes if we already have data
      if (notifications.length === 0) setLoading(true);
      
      const response = await fetch('/api/admin/notifications');
      if (response.ok) {
        const data = await response.json();
        const allNotifications = data.data?.notifications || [];
        setNotifications(allNotifications);
        setUnreadCount(allNotifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [session]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    // Refresh when opening
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      try {
        await fetch(`/api/admin/notifications/${notification._id}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Update local state
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    handleClose();
    
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleViewAll = () => {
    handleClose();
    // router.push('/dashboard/admin/notifications'); 
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-controls={open ? 'notification-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        id="notification-menu"
        open={open}
        onClose={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            width: 360,
            maxHeight: 480,
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Notifications</Typography>
        </Box>
        
        <Divider />
        
        {loading && notifications.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : recentNotifications.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {recentNotifications.map((notification) => (
              <ListItem 
                key={notification._id} 
                button 
                onClick={() => handleNotificationClick(notification)}
                alignItems="flex-start"
                sx={{ 
                  bgcolor: notification.read ? 'transparent' : 'action.hover',
                  '&:hover': { bgcolor: 'action.selected' }
                }}
              >
                {!notification.read && (
                  <CircleIcon sx={{ fontSize: 10, color: 'primary.main', mt: 1, mr: 1 }} />
                )}
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" component="span">
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.primary" component="span" display="block">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : ''}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
        
        <Divider />
        
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button fullWidth onClick={handleViewAll}>
            View All Notifications
          </Button>
        </Box>
      </Menu>
    </>
  );
}
