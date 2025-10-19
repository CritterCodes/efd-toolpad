'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Alert,
  Container,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { forceLogout, debugAuthState } from '@/lib/auth-utils';
import LogoutIcon from '@mui/icons-material/Logout';
import BugReportIcon from '@mui/icons-material/BugReport';
import SearchIcon from '@mui/icons-material/Search';

export default function EmergencyLogoutPage() {
  const { data: session, status } = useSession();

  const handleForceLogout = async () => {
    console.log('🚨 [EMERGENCY] Force logout triggered by user');
    await forceLogout();
  };

  const handleRegularLogout = async () => {
    try {
      console.log('🚪 [EMERGENCY] Regular logout attempted');
      const { signOut } = await import('next-auth/react');
      await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: true
      });
    } catch (error) {
      console.error('❌ [EMERGENCY] Regular logout failed, falling back to force logout:', error);
      await forceLogout();
    }
  };

  const handleDebugAuth = () => {
    console.log('🔍 [EMERGENCY] Running authentication debug...');
    debugAuthState();
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <BugReportIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              🚨 Emergency Session Management
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Use this page to resolve authentication issues
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Current Session Status</Typography>
            <Typography><strong>Status:</strong> {status}</Typography>
            <Typography><strong>Email:</strong> {session?.user?.email || 'Not available'}</Typography>
            <Typography><strong>Role:</strong> {session?.user?.role || 'Not available'}</Typography>
            <Typography><strong>Name:</strong> {session?.user?.name || 'Not available'}</Typography>
          </Alert>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            🔧 Logout Options
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="outlined"
              color="info"
              size="large"
              onClick={handleDebugAuth}
              startIcon={<SearchIcon />}
              fullWidth
            >
              🔍 Debug Auth State (Check Console)
            </Button>

            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleRegularLogout}
              startIcon={<LogoutIcon />}
              fullWidth
            >
              🚪 Try Regular Logout First
            </Button>

            <Button
              variant="contained"
              color="warning"
              size="large"
              onClick={handleForceLogout}
              fullWidth
            >
              🚨 Nuclear Logout & Clear Everything
            </Button>
          </Box>

          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>When to use Force Logout:</strong>
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Regular logout doesn&apos;t work</li>
              <li>You&apos;re stuck with wrong role (e.g., &apos;client&apos; instead of &apos;admin&apos;)</li>
              <li>Cannot access dashboard or admin features</li>
              <li>Session appears corrupted or outdated</li>
            </ul>
          </Alert>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>What Force Logout does:</strong>
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Clears server-side session</li>
              <li>Removes all authentication cookies</li>
              <li>Clears browser storage</li>
              <li>Redirects to fresh signin page</li>
            </ul>
          </Alert>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            🔬 Debug Tools
          </Typography>

          <Button 
            variant="outlined"
            color="info" 
            onClick={async () => {
              console.log('🔍 Starting comprehensive auth debug...')
              
              // Client-side debug function
              const debugClientAuthState = () => {
                console.log('\n=== 🖥️ CLIENT AUTH DEBUG START ===')
                console.log('⏰ Timestamp:', new Date().toISOString())
                console.log('🌍 Location:', window.location.href)
                
                // Check cookies with detailed parsing
                console.log('🍪 === COOKIE ANALYSIS ===')
                const cookieString = document.cookie
                console.log('📋 Raw cookie string:', `"${cookieString}"`)
                
                if (cookieString) {
                  const cookies = cookieString.split(';')
                  console.log('🔢 Total cookies found:', cookies.length)
                  
                  const authCookies = []
                  cookies.forEach((cookie, index) => {
                    const [name, ...valueParts] = cookie.trim().split('=')
                    const value = valueParts.join('=')
                    
                    console.log(`  ${index + 1}. 🍪 "${name}" = "${value}"`)
                    
                    if (name && (name.includes('auth') || name.includes('session') || name.includes('csrf') || name.includes('next-auth'))) {
                      authCookies.push({ name, value })
                      console.log(`    ⚠️  AUTH COOKIE DETECTED: ${name}`)
                      console.log(`    📏 Length: ${value?.length || 0} characters`)
                      if (value && value.length > 50) {
                        console.log(`    📝 Preview: ${value.substring(0, 50)}...`)
                        console.log(`    📝 End: ...${value.substring(value.length - 20)}`)
                      } else {
                        console.log(`    📝 Full value: ${value}`)
                      }
                    }
                  })
                  
                  console.log('🎯 Auth cookies summary:', authCookies.length, 'found')
                  authCookies.forEach(cookie => {
                    console.log(`  🎯 ${cookie.name}: ${cookie.value?.length || 0} chars`)
                  })
                } else {
                  console.log('❌ No cookies found in document.cookie')
                }
                
                // Check localStorage with auth focus
                console.log('\n💾 === LOCAL STORAGE ANALYSIS ===')
                
                // CRITICAL: Check for devViewRole first!
                const devViewRole = localStorage.getItem('devViewRole')
                console.log('🎭 CRITICAL: devViewRole in localStorage:', devViewRole)
                if (devViewRole) {
                  console.log('⚠️  THIS IS OVERRIDING YOUR SESSION ROLE!')
                  console.log('🔧 This role switching feature is why you see "client" instead of "admin"')
                }
                
                const authLocalStorage = []
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i)
                  if (key) {
                    const value = localStorage.getItem(key)
                    console.log(`  💾 "${key}" = "${value?.substring(0, 100)}${value?.length > 100 ? '...' : ''}"`)
                    
                    if (key.includes('auth') || key.includes('session') || key.includes('next') || key.includes('role') || key.includes('devView')) {
                      authLocalStorage.push({ key, value })
                      console.log(`    ⚠️  AUTH/ROLE RELATED: ${key}`)
                    }
                  }
                }
                console.log('🎯 Auth/Role localStorage items:', authLocalStorage.length)
                
                // Check sessionStorage with auth focus
                console.log('\n🔒 === SESSION STORAGE ANALYSIS ===')
                const authSessionStorage = []
                for (let i = 0; i < sessionStorage.length; i++) {
                  const key = sessionStorage.key(i)
                  if (key) {
                    const value = sessionStorage.getItem(key)
                    console.log(`  🔒 "${key}" = "${value?.substring(0, 100)}${value?.length > 100 ? '...' : ''}"`)
                    
                    if (key.includes('auth') || key.includes('session') || key.includes('next')) {
                      authSessionStorage.push({ key, value })
                      console.log(`    ⚠️  AUTH SESSION STORAGE: ${key}`)
                    }
                  }
                }
                console.log('🎯 Auth sessionStorage items:', authSessionStorage.length)
                
                console.log('=== 🖥️ CLIENT AUTH DEBUG END ===\n')
              }
              
              // Server-side debug call with detailed response parsing
              const debugServerAuthState = async () => {
                console.log('\n=== 🖥️ SERVER AUTH DEBUG START ===')
                console.log('⏰ Timestamp:', new Date().toISOString())
                
                try {
                  console.log('🌐 Calling /api/auth/debug-session...')
                  const response = await fetch('/api/auth/debug-session', {
                    credentials: 'include',
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  })
                  
                  console.log('📊 Response status:', response.status)
                  console.log('📊 Response headers:')
                  response.headers.forEach((value, key) => {
                    console.log(`  📋 ${key}: ${value}`)
                  })
                  
                  const data = await response.json()
                  console.log('� Raw response data:', data)
                  
                  if (data.success) {
                    console.log('�️ === SERVER SESSION STATE ===')
                    console.log('  ✅ Has session:', data.debug.hasSession)
                    console.log('  👤 Session user:', data.debug.sessionUser)
                    console.log('  🍪 Auth cookies count:', data.debug.authCookiesCount)
                    console.log('  🏷️ Auth cookie names:', data.debug.authCookieNames)
                    console.log('  🌐 User agent:', data.debug.userAgent?.substring(0, 100))
                    console.log('  🔗 Origin:', data.debug.origin)
                    console.log('  📍 Referer:', data.debug.referer)
                    console.log('  🏠 Host:', data.debug.host)
                  } else {
                    console.log('❌ Server debug failed:', data.error)
                  }
                } catch (error) {
                  console.error('❌ Server debug request failed:', error)
                }
                
                console.log('=== 🖥️ SERVER AUTH DEBUG END ===\n')
              }
              
              // Run both debugs
              debugClientAuthState()
              await debugServerAuthState()
              
              // Also check current session via useSession hook
              console.log('\n=== 🎣 HOOK STATE DEBUG ===')
              console.log('⏰ Timestamp:', new Date().toISOString())
              console.log('📊 Current status from hook:', status)
              console.log('👤 Current session from hook:', session)
              console.log('=== 🎣 HOOK STATE DEBUG END ===\n')
            }}
            sx={{ mr: 2, mb: 2 }}
          >
            🔍 Debug Auth State
          </Button>

          <Button 
            variant="contained"
            color="warning" 
            onClick={() => {
              console.log('🎭 Checking and clearing devViewRole...')
              
              const devViewRole = localStorage.getItem('devViewRole')
              console.log('🔍 Current devViewRole:', devViewRole)
              
              if (devViewRole) {
                localStorage.removeItem('devViewRole')
                console.log('✅ Cleared devViewRole from localStorage')
                
                // Trigger a page reload to refresh the navigation
                console.log('🔄 Reloading page to refresh navigation...')
                window.location.reload()
              } else {
                console.log('ℹ️ No devViewRole found in localStorage')
                alert('No devViewRole found in localStorage. The issue might be elsewhere.')
              }
            }}
            sx={{ mr: 2, mb: 2 }}
          >
            🎭 Clear Role Override
          </Button>

          <Button 
            variant="contained"
            color="error" 
            onClick={async () => {
              console.log('☢️ Starting NUCLEAR logout...')
              
              // Clear all browser storage first
              const clearAllStorage = async () => {
                try {
                  console.log('🗑️ Clearing localStorage...')
                  
                  // CRITICAL: Clear the devViewRole that's overriding admin role!
                  const devViewRole = localStorage.getItem('devViewRole')
                  console.log('🎭 Found devViewRole in localStorage:', devViewRole)
                  if (devViewRole) {
                    localStorage.removeItem('devViewRole')
                    console.log('✅ Cleared devViewRole from localStorage')
                  }
                  
                  // Clear all localStorage
                  localStorage.clear()
                  
                  // Clear all sessionStorage
                  console.log('🗑️ Clearing sessionStorage...')
                  sessionStorage.clear()
                  
                  // Clear IndexedDB
                  console.log('🗑️ Clearing IndexedDB...')
                  if ('indexedDB' in window) {
                    const databases = await indexedDB.databases?.() || []
                    for (const db of databases) {
                      const deleteReq = indexedDB.deleteDatabase(db.name)
                      await new Promise((resolve, reject) => {
                        deleteReq.onsuccess = () => resolve()
                        deleteReq.onerror = () => reject(deleteReq.error)
                      })
                      console.log(`🗑️ Deleted IndexedDB: ${db.name}`)
                    }
                  }
                  
                  // Clear service worker caches
                  console.log('🗑️ Clearing service worker caches...')
                  if ('caches' in window) {
                    const cacheNames = await caches.keys()
                    console.log('📦 Found caches:', cacheNames)
                    await Promise.all(cacheNames.map(name => caches.delete(name)))
                    console.log('✅ Cleared all caches')
                  }
                  
                  // Unregister service workers
                  if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations()
                    console.log('🛠️ Found service workers:', registrations.length)
                    for (const registration of registrations) {
                      await registration.unregister()
                      console.log('🗑️ Unregistered service worker:', registration.scope)
                    }
                  }
                  
                  console.log('✅ All browser storage cleared')
                } catch (error) {
                  console.error('❌ Error clearing storage:', error)
                }
              }
              
              // Clear cookies client-side
              const clearAllCookies = () => {
                console.log('🍪 Nuclear cookie clearing...')
                const domains = ['', '.repair.engelfinedesign.com', '.engelfinedesign.com', 'repair.engelfinedesign.com', 'localhost']
                const paths = ['/', '/api', '/auth']
                
                // Get all current cookies
                const cookies = document.cookie.split(';')
                cookies.forEach(cookie => {
                  const eqPos = cookie.indexOf('=')
                  const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
                  
                  if (name) {
                    domains.forEach(domain => {
                      paths.forEach(path => {
                        // Try different combinations to clear the cookie
                        try {
                          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}`
                          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`
                          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
                        } catch (e) {
                          // Ignore errors for invalid cookie settings
                        }
                      })
                    })
                    console.log(`🗑️ Cleared cookie: ${name}`)
                  }
                })
              }
              
              // Execute nuclear cleanup
              await clearAllStorage()
              clearAllCookies()
              
              // Call server-side emergency logout
              console.log('☢️ Calling server emergency logout...')
              try {
                const response = await fetch('/api/auth/emergency-logout', { 
                  method: 'POST',
                  credentials: 'include'
                })
                console.log('Server logout response:', response.status)
              } catch (error) {
                console.error('Server logout error:', error)
              }
              
              // Force page reload with cache bypass
              console.log('🔄 Force reloading page...')
              window.location.href = window.location.href + '?nuclear=' + Date.now()
            }}
            sx={{ mb: 2 }}
          >
            ☢️ NUCLEAR LOGOUT
          </Button>

          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Nuclear Logout:</strong> This will completely wipe all browser data and force a clean start. 
              Use only if regular force logout fails.
            </Typography>
          </Alert>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            🔧 Database Role Fix
          </Typography>

          <Button 
            variant="outlined"
            color="secondary" 
            onClick={async () => {
              console.log('🔍 Checking user role in database...')
              
              try {
                const email = session?.user?.email || 'jacobaengel55@gmail.com'
                console.log('📧 Checking role for email:', email)
                
                const response = await fetch(`/api/auth/fix-role?email=${encodeURIComponent(email)}`, {
                  credentials: 'include'
                })
                
                const data = await response.json()
                console.log('📊 Database user data:', data)
                
                if (data.success) {
                  console.log('👤 Current user in database:')
                  console.log('  📧 Email:', data.user.email)
                  console.log('  🎭 Role:', data.user.role)
                  console.log('  📋 Status:', data.user.status)
                  console.log('  👤 Name:', data.user.firstName, data.user.lastName)
                  
                  alert(`Database Role Check:\n\nEmail: ${data.user.email}\nRole: ${data.user.role}\nStatus: ${data.user.status}\n\nIf role is wrong, use the Fix Role button.`)
                } else {
                  console.error('❌ Error:', data.error)
                  alert(`Error checking role: ${data.error}`)
                }
              } catch (error) {
                console.error('❌ Failed to check role:', error)
                alert(`Failed to check role: ${error.message}`)
              }
            }}
            sx={{ mr: 2, mb: 2 }}
          >
            🔍 Check Database Role
          </Button>

          <Button 
            variant="contained"
            color="success" 
            onClick={async () => {
              console.log('🔧 Fixing user role in database...')
              
              const confirmFix = confirm('This will change your database role from "client" to "admin".\n\nAre you sure you want to proceed?')
              if (!confirmFix) {
                console.log('ℹ️ Role fix cancelled by user')
                return
              }
              
              try {
                const email = session?.user?.email || 'jacobaengel55@gmail.com'
                console.log('📧 Fixing role for email:', email)
                
                const response = await fetch('/api/auth/fix-role', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  credentials: 'include',
                  body: JSON.stringify({
                    email: email,
                    newRole: 'admin'
                  })
                })
                
                const data = await response.json()
                console.log('📊 Role fix response:', data)
                
                if (data.success) {
                  console.log('✅ Role fixed successfully!')
                  console.log('  📧 Email:', data.user.email)
                  console.log('  🎭 Old Role:', data.user.oldRole)
                  console.log('  🎭 New Role:', data.user.newRole)
                  
                  alert(`✅ Role Fixed Successfully!\n\nEmail: ${data.user.email}\nOld Role: ${data.user.oldRole}\nNew Role: ${data.user.newRole}\n\nPlease logout and login again to see the changes.`)
                  
                  // Suggest logout after role fix
                  const shouldLogout = confirm('Role has been fixed in the database.\n\nWould you like to logout now so you can login with the new admin role?')
                  if (shouldLogout) {
                    window.location.href = '/api/auth/signout'
                  }
                } else {
                  console.error('❌ Role fix failed:', data.error)
                  alert(`❌ Role Fix Failed: ${data.error}`)
                }
              } catch (error) {
                console.error('❌ Failed to fix role:', error)
                alert(`Failed to fix role: ${error.message}`)
              }
            }}
            sx={{ mb: 2 }}
          >
            🔧 Fix Role to Admin
          </Button>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Database Role Fix:</strong> If your session shows &quot;client&quot; role but you should have &quot;admin&quot; access, 
              this will check and update your role directly in the MongoDB database. You&apos;ll need to logout and login again after the fix.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Container>
  );
}