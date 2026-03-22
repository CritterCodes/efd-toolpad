export const debugClientAuthState = () => {
    console.log('\n=== 🖥️ CLIENT AUTH DEBUG START ===');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🌍 Location:', window.location.href);
    
    console.log('🍪 === COOKIE ANALYSIS ===');
    const cookieString = document.cookie;
    console.log('📋 Raw cookie string:', `"${cookieString}"`);
    
    if (cookieString) {
      const cookies = cookieString.split(';');
      console.log('🔢 Total cookies found:', cookies.length);
      
      const authCookies = [];
      cookies.forEach((cookie, index) => {
        const [name, ...valueParts] = cookie.trim().split('=');
        const value = valueParts.join('=');
        
        console.log(`  ${index + 1}. 🍪 "${name}" = "${value}"`);
        
        if (name && (name.includes('auth') || name.includes('session') || name.includes('csrf') || name.includes('next-auth'))) {
          authCookies.push({ name, value });
          console.log(`    ⚠️  AUTH COOKIE DETECTED: ${name}`);
          console.log(`    📏 Length: ${value?.length || 0} characters`);
          if (value && value.length > 50) {
            console.log(`    📝 Preview: ${value.substring(0, 50)}...`);
            console.log(`    📝 End: ...${value.substring(value.length - 20)}`);
          } else {
            console.log(`    📝 Full value: ${value}`);
          }
        }
      });
      
      console.log('🎯 Auth cookies summary:', authCookies.length, 'found');
      authCookies.forEach(cookie => {
        console.log(`  🎯 ${cookie.name}: ${cookie.value?.length || 0} chars`);
      });
    } else {
      console.log('❌ No cookies found in document.cookie');
    }
    
    console.log('\n💾 === LOCAL STORAGE ANALYSIS ===');
    const devViewRole = localStorage.getItem('devViewRole');
    console.log('🎭 CRITICAL: devViewRole in localStorage:', devViewRole);
    if (devViewRole) {
      console.log('⚠️  THIS IS OVERRIDING YOUR SESSION ROLE!');
      console.log('🔧 This role switching feature is why you see "client" instead of "admin"');
    }
    
    const authLocalStorage = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        console.log(`  💾 "${key}" = "${value?.substring(0, 100)}${value?.length > 100 ? '...' : ''}"`);
        
        if (key.includes('auth') || key.includes('session') || key.includes('next') || key.includes('role') || key.includes('devView')) {
          authLocalStorage.push({ key, value });
          console.log(`    ⚠️  AUTH/ROLE RELATED: ${key}`);
        }
      }
    }
    console.log('🎯 Auth/Role localStorage items:', authLocalStorage.length);
    
    console.log('\n🔒 === SESSION STORAGE ANALYSIS ===');
    const authSessionStorage = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        console.log(`  🔒 "${key}" = "${value?.substring(0, 100)}${value?.length > 100 ? '...' : ''}"`);
        
        if (key.includes('auth') || key.includes('session') || key.includes('next')) {
          authSessionStorage.push({ key, value });
          console.log(`    ⚠️  AUTH SESSION STORAGE: ${key}`);
        }
      }
    }
    console.log('🎯 Auth sessionStorage items:', authSessionStorage.length);
    console.log('=== 🖥️ CLIENT AUTH DEBUG END ===\n');
  };
  
export const debugServerAuthState = async () => {
    console.log('\n=== 🖥️ SERVER AUTH DEBUG START ===');
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    try {
        console.log('🌐 Calling /api/auth/debug-session...');
        const response = await fetch('/api/auth/debug-session', {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
        });
        
        console.log('📊 Response status:', response.status);
        console.log('📊 Response headers:');
        response.headers.forEach((value, key) => {
        console.log(`  📋 ${key}: ${value}`);
        });
        
        const data = await response.json();
        console.log('📦 Raw response data:', data);
        
        if (data.success) {
        console.log('🛡️ === SERVER SESSION STATE ===');
        console.log('  ✅ Has session:', data.debug.hasSession);
        console.log('  👤 Session user:', data.debug.sessionUser);
        console.log('  🍪 Auth cookies count:', data.debug.authCookiesCount);
        console.log('  🏷️ Auth cookie names:', data.debug.authCookieNames);
        console.log('  🌐 User agent:', data.debug.userAgent?.substring(0, 100));
        console.log('  🔗 Origin:', data.debug.origin);
        console.log('  📍 Referer:', data.debug.referer);
        console.log('  🏠 Host:', data.debug.host);
        } else {
        console.log('❌ Server debug failed:', data.error);
        }
    } catch (error) {
        console.error('❌ Server debug request failed:', error);
    }
    
    console.log('=== 🖥️ SERVER AUTH DEBUG END ===\n');
};

export const clearAllStorage = async () => {
  try {
    console.log('🗑️ Clearing localStorage...');
    const devViewRole = localStorage.getItem('devViewRole');
    if (devViewRole) {
      localStorage.removeItem('devViewRole');
      console.log('✅ Cleared devViewRole from localStorage');
    }
    localStorage.clear();
    
    console.log('🗑️ Clearing sessionStorage...');
    sessionStorage.clear();
    
    console.log('🗑️ Clearing IndexedDB...');
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases?.() || [];
      for (const db of databases) {
        const deleteReq = indexedDB.deleteDatabase(db.name);
        await new Promise((resolve, reject) => {
          deleteReq.onsuccess = () => resolve();
          deleteReq.onerror = () => reject(deleteReq.error);
        });
        console.log(`🗑️ Deleted IndexedDB: ${db.name}`);
      }
    }
    
    console.log('🗑️ Clearing service worker caches...');
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('✅ Cleared all caches');
    }
    
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('🗑️ Unregistered service worker:', registration.scope);
      }
    }
    console.log('✅ All browser storage cleared');
  } catch (error) {
    console.error('❌ Error clearing storage:', error);
  }
};

export const clearAllCookies = () => {
  console.log('🍪 Nuclear cookie clearing...');
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
      console.log(`🗑️ Cleared cookie: ${name}`);
    }
  });
};