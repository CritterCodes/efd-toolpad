'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  IconButton,
  Slide,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  GetApp as InstallIcon, 
  Close as CloseIcon,
  PhoneIphone as MobileIcon,
  Computer as DesktopIcon
} from '@mui/icons-material';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    // Check if PWA is enabled (service worker registration exists)
    const checkPWAEnabled = () => {
      if (!('serviceWorker' in navigator)) {
        return false;
      }
      return true;
    };

    if (!checkPWAEnabled()) {
      return;
    }

    // Check if already installed
    const checkInstalled = () => {
      if (typeof window !== 'undefined') {
        // Check if running in standalone mode (installed PWA)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                            window.navigator.standalone === true;
        setIsInstalled(isStandalone);
        
        // Don't show prompt if already installed
        if (isStandalone) {
          setShowInstallPrompt(false);
          return;
        }
      }
    };

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('PWA Install prompt available');
      // Prevent the mini-infobar from appearing
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      
      // Check if user has previously dismissed
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');
      
      // Show prompt if not dismissed, or if dismissed more than 7 days ago
      if (!dismissed || (dismissedTime && Date.now() - parseInt(dismissedTime) > 7 * 24 * 60 * 60 * 1000)) {
        setTimeout(() => setShowInstallPrompt(true), 3000); // Show after 3 seconds
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    checkInstalled();
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`User response to install prompt: ${outcome}`);
      
      if (outcome === 'dismissed') {
        // User dismissed, remember this
        localStorage.setItem('pwa-install-dismissed', 'true');
        localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
      }
      
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  return (
    <Slide direction="up" in={showInstallPrompt}>
      <Box
        sx={{
          position: 'fixed',
          bottom: isMobile ? 16 : 24,
          left: isMobile ? 16 : 24,
          right: isMobile ? 16 : 'auto',
          zIndex: 1300,
          maxWidth: isMobile ? 'calc(100vw - 32px)' : 400,
        }}
      >
        <Card elevation={6}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {isMobile ? <MobileIcon color="primary" /> : <DesktopIcon color="primary" />}
                  <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 600 }}>
                    Install EFD Admin
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Install our app for faster access and offline capabilities. 
                  Perfect for your checkout counter!
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<InstallIcon />}
                    onClick={handleInstallClick}
                  >
                    Install
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={handleDismiss}
                    color="inherit"
                  >
                    Not now
                  </Button>
                </Box>
              </Box>
              
              <IconButton
                size="small"
                onClick={handleDismiss}
                sx={{ mt: -1, mr: -1 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Slide>
  );
}
