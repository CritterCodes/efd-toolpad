// Comprehensive cookie and auth debugging utility

export function logAllCookies(context = 'UNKNOWN') {
  console.log(`\n🍪 === COOKIE DEBUG [${context}] === 🍪`)
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`)
  
  if (typeof document !== 'undefined') {
    console.log(`📄 Document.cookie: "${document.cookie}"`)
    
    if (document.cookie) {
      const cookies = document.cookie.split(';')
      console.log(`🔢 Total cookies found: ${cookies.length}`)
      
      cookies.forEach((cookie, index) => {
        const [name, ...valueParts] = cookie.trim().split('=')
        const value = valueParts.join('=')
        console.log(`  ${index + 1}. 🍪 "${name}" = "${value}"`)
        
        // Highlight auth-related cookies
        if (name && (name.includes('auth') || name.includes('session') || name.includes('csrf') || name.includes('next-auth'))) {
          console.log(`    ⚠️  AUTH COOKIE DETECTED: ${name}`)
          if (value && value.length > 50) {
            console.log(`    📝 Value (truncated): ${value.substring(0, 50)}...`)
            console.log(`    📏 Full length: ${value.length} characters`)
          } else {
            console.log(`    📝 Full value: ${value}`)
          }
        }
      })
    } else {
      console.log(`❌ No cookies found in document.cookie`)
    }
  } else {
    console.log(`⚠️  document not available (server-side)`)
  }
  
  console.log(`🍪 === END COOKIE DEBUG [${context}] === 🍪\n`)
}

export function logRequestCookies(request, context = 'REQUEST') {
  console.log(`\n🌐 === REQUEST COOKIE DEBUG [${context}] === 🌐`)
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`)
  console.log(`🔗 URL: ${request.url}`)
  console.log(`📱 Method: ${request.method}`)
  
  const cookieHeader = request.headers.get('cookie')
  console.log(`📋 Cookie header: "${cookieHeader}"`)
  
  if (cookieHeader) {
    const cookies = cookieHeader.split(';')
    console.log(`🔢 Total cookies in request: ${cookies.length}`)
    
    cookies.forEach((cookie, index) => {
      const [name, ...valueParts] = cookie.trim().split('=')
      const value = valueParts.join('=')
      console.log(`  ${index + 1}. 🍪 "${name}" = "${value}"`)
      
      // Highlight auth-related cookies
      if (name && (name.includes('auth') || name.includes('session') || name.includes('csrf') || name.includes('next-auth'))) {
        console.log(`    ⚠️  AUTH COOKIE IN REQUEST: ${name}`)
        if (value && value.length > 50) {
          console.log(`    📝 Value (truncated): ${value.substring(0, 50)}...`)
          console.log(`    📏 Full length: ${value.length} characters`)
        } else {
          console.log(`    📝 Full value: ${value}`)
        }
      }
    })
  } else {
    console.log(`❌ No cookie header in request`)
  }
  
  // Log other relevant headers
  console.log(`🏠 Host: ${request.headers.get('host')}`)
  console.log(`🔄 Referer: ${request.headers.get('referer')}`)
  console.log(`🌍 Origin: ${request.headers.get('origin')}`)
  console.log(`🤖 User-Agent: ${request.headers.get('user-agent')?.substring(0, 100)}...`)
  
  console.log(`🌐 === END REQUEST COOKIE DEBUG [${context}] === 🌐\n`)
}

export function logResponseCookies(response, context = 'RESPONSE') {
  console.log(`\n📤 === RESPONSE COOKIE DEBUG [${context}] === 📤`)
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`)
  console.log(`📊 Status: ${response.status}`)
  
  // Check for Set-Cookie headers
  const setCookieHeaders = response.headers.getSetCookie?.() || []
  console.log(`🍪 Set-Cookie headers count: ${setCookieHeaders.length}`)
  
  if (setCookieHeaders.length > 0) {
    setCookieHeaders.forEach((setCookie, index) => {
      console.log(`  ${index + 1}. 📤 Set-Cookie: "${setCookie}"`)
      
      // Parse cookie name from Set-Cookie header
      const cookieName = setCookie.split('=')[0]
      if (cookieName && (cookieName.includes('auth') || cookieName.includes('session') || cookieName.includes('csrf') || cookieName.includes('next-auth'))) {
        console.log(`    ⚠️  AUTH COOKIE BEING SET: ${cookieName}`)
      }
    })
  } else {
    console.log(`❌ No Set-Cookie headers in response`)
  }
  
  console.log(`📤 === END RESPONSE COOKIE DEBUG [${context}] === 📤\n`)
}

export function logSessionData(session, context = 'SESSION') {
  console.log(`\n👤 === SESSION DEBUG [${context}] === 👤`)
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`)
  
  if (session) {
    console.log(`✅ Session exists`)
    console.log(`📧 Email: ${session.user?.email || 'N/A'}`)
    console.log(`👤 Name: ${session.user?.name || 'N/A'}`)
    console.log(`🎭 Role: ${session.user?.role || 'N/A'}`)
    console.log(`🆔 User ID: ${session.user?.id || 'N/A'}`)
    console.log(`⏰ Expires: ${session.expires || 'N/A'}`)
    
    // Log full session object (safely)
    try {
      console.log(`📋 Full session:`, JSON.stringify(session, null, 2))
    } catch (error) {
      console.log(`❌ Error stringifying session:`, error.message)
    }
  } else {
    console.log(`❌ No session data`)
  }
  
  console.log(`👤 === END SESSION DEBUG [${context}] === 👤\n`)
}

export function logJWTData(token, context = 'JWT') {
  console.log(`\n🎫 === JWT DEBUG [${context}] === 🎫`)
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`)
  
  if (token) {
    console.log(`✅ JWT token exists`)
    console.log(`📧 Email: ${token.email || 'N/A'}`)
    console.log(`👤 Name: ${token.name || 'N/A'}`)
    console.log(`🎭 Role: ${token.role || 'N/A'}`)
    console.log(`🆔 User ID: ${token.sub || token.id || 'N/A'}`)
    console.log(`⏰ Issued at: ${token.iat ? new Date(token.iat * 1000).toISOString() : 'N/A'}`)
    console.log(`⏰ Expires at: ${token.exp ? new Date(token.exp * 1000).toISOString() : 'N/A'}`)
    
    // Log full token object (safely)
    try {
      console.log(`📋 Full token:`, JSON.stringify(token, null, 2))
    } catch (error) {
      console.log(`❌ Error stringifying token:`, error.message)
    }
  } else {
    console.log(`❌ No JWT token data`)
  }
  
  console.log(`🎫 === END JWT DEBUG [${context}] === 🎫\n`)
}

// Comprehensive auth state logger
export function logFullAuthState(context = 'FULL_AUTH_STATE') {
  console.log(`\n🔍 === COMPREHENSIVE AUTH DEBUG [${context}] === 🔍`)
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`)
  console.log(`🌍 Location: ${typeof window !== 'undefined' ? window.location.href : 'Server-side'}`)
  
  // Log cookies
  logAllCookies(`${context}_COOKIES`)
  
  // Log localStorage if available
  if (typeof localStorage !== 'undefined') {
    console.log(`💾 === LOCAL STORAGE DEBUG ===`)
    const authKeys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('auth') || key.includes('session') || key.includes('next'))) {
        authKeys.push(key)
        const value = localStorage.getItem(key)
        console.log(`  💾 "${key}" = "${value?.substring(0, 100)}${value?.length > 100 ? '...' : ''}"`)
      }
    }
    if (authKeys.length === 0) {
      console.log(`  ❌ No auth-related items in localStorage`)
    }
  }
  
  // Log sessionStorage if available
  if (typeof sessionStorage !== 'undefined') {
    console.log(`🔒 === SESSION STORAGE DEBUG ===`)
    const authKeys = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && (key.includes('auth') || key.includes('session') || key.includes('next'))) {
        authKeys.push(key)
        const value = sessionStorage.getItem(key)
        console.log(`  🔒 "${key}" = "${value?.substring(0, 100)}${value?.length > 100 ? '...' : ''}"`)
      }
    }
    if (authKeys.length === 0) {
      console.log(`  ❌ No auth-related items in sessionStorage`)
    }
  }
  
  console.log(`🔍 === END COMPREHENSIVE AUTH DEBUG [${context}] === 🔍\n`)
}