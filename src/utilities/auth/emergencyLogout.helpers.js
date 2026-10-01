export const clearAllStorage = async () => {
  try {
    const devViewRole = localStorage.getItem('devViewRole');
    if (devViewRole) {
      localStorage.removeItem('devViewRole');
    }
    localStorage.clear();
    
    sessionStorage.clear();
    
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases?.() || [];
      for (const db of databases) {
        const deleteReq = indexedDB.deleteDatabase(db.name);
        await new Promise((resolve, reject) => {
          deleteReq.onsuccess = () => resolve();
          deleteReq.onerror = () => reject(deleteReq.error);
        });
      }
    }
    
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
  } catch (error) {
    console.error('❌ Error clearing storage:', error);
  }
};

export const clearAllCookies = () => {
  const domains = ['', '.repair.engelfinedesign.com', '.engelfinedesign.com', 'repair.engelfinedesign.com', 'localhost'];
  const paths = ['/', '/api', '/auth'];
  
  const cookies = document.cookie.split(';');
  cookies.forEach(cookie => {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    
    if (name) {
      domains.forEach(domain => {
        paths.forEach(path => {
          try {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          } catch (e) {
          }
        });
      });
    }
  });
};