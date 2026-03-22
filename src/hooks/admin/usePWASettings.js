import { useState, useEffect } from 'react';

export const usePWASettings = () => {
    const [installStatus, setInstallStatus] = useState({
        isInstallable: false,
        isInstalled: false,
        isStandalone: false,
        platform: 'unknown'
    });
    
    const [appStatus, setAppStatus] = useState({
        isOnline: true,
        serviceWorker: false,
        cacheSize: 0
    });
    
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [installPromptEnabled, setInstallPromptEnabled] = useState(true);

    const checkInstallStatus = () => {
        if (typeof window !== 'undefined') {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                               window.navigator.standalone === true;
            const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            setInstallStatus({
                isInstalled: isStandalone,
                isStandalone: isStandalone,
                platform: isMobile ? 'mobile' : 'desktop',
                isInstallable: !isStandalone && 'serviceWorker' in navigator
            });
        }
    };

    const checkAppStatus = () => {
        if (typeof window !== 'undefined') {
            const isOnline = navigator.onLine;
            const hasServiceWorker = 'serviceWorker' in navigator;
            
            setAppStatus({
                isOnline,
                serviceWorker: hasServiceWorker,
                cacheSize: 0
            });

            const handleOnline = () => setAppStatus(prev => ({ ...prev, isOnline: true }));
            const handleOffline = () => setAppStatus(prev => ({ ...prev, isOnline: false }));
            
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
            
            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }
    };

    const setupInstallPrompt = () => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setInstallStatus(prev => ({ ...prev, isInstallable: true }));
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    };

    useEffect(() => {
        checkInstallStatus();
        checkAppStatus();
        setupInstallPrompt();
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    console.log('PWA installed');
                    alert('PWA installation accepted!');
                }
                
                setDeferredPrompt(null);
                setTimeout(checkInstallStatus, 1000);
            } catch (error) {
                console.error('Installation failed:', error);
                alert('Installation failed: ' + error.message);
            }
        } else {
            const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
            const isEdge = /Edg/.test(navigator.userAgent);
            
            let instructions = "To install this PWA manually:\n\n";
            
            if (isChrome || isEdge) {
                instructions += "1. Look for the install icon (⊕) in the address bar\n";
                instructions += "2. Or use the browser menu: More Tools → Install App\n";
                instructions += "3. Or use Ctrl+Shift+A keyboard shortcut\n\n";
            } else {
                instructions += "1. Use a Chromium-based browser (Chrome, Edge) for best PWA support\n";
                instructions += "2. Navigate to the app in the browser\n";
                instructions += "3. Look for install options in the browser menu\n\n";
            }
            
            instructions += "Note: PWA installation prompts work better in production builds.\n";
            instructions += "For development, manual installation may be required.";
            
            alert(instructions);
        }
    };

    const handleToggleInstallPrompt = (event) => {
        const enabled = event.target.checked;
        setInstallPromptEnabled(enabled);
        
        if (enabled) {
            localStorage.removeItem('pwa-install-dismissed');
            localStorage.removeItem('pwa-install-dismissed-time');
        } else {
            localStorage.setItem('pwa-install-dismissed', 'true');
            localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
        }
    };

    const clearAppData = async () => {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                registration.unregister();
            }
        }
        
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (let cacheName of cacheNames) {
                await caches.delete(cacheName);
            }
        }
        
        localStorage.removeItem('pwa-install-dismissed');
        localStorage.removeItem('pwa-install-dismissed-time');
        
        alert('App data cleared. Please refresh the page.');
    };

    return {
        installStatus,
        appStatus,
        deferredPrompt,
        installPromptEnabled,
        handleInstall,
        handleToggleInstallPrompt,
        clearAppData
    };
};