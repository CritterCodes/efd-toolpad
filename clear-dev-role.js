// Quick script to clear devViewRole and verify localStorage
console.log('🔍 === LOCALSTORAGE DEBUG ===')
console.log('⏰ Timestamp:', new Date().toISOString())

// Check current localStorage values
console.log('📋 Current localStorage values:')
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i)
  const value = localStorage.getItem(key)
  console.log(`  ${key}: ${value}`)
}

// Focus on devViewRole specifically
const currentDevViewRole = localStorage.getItem('devViewRole')
console.log('')
console.log('🎭 Current devViewRole:', currentDevViewRole)

if (currentDevViewRole) {
  console.log('🚨 FOUND THE PROBLEM!')
  console.log('  devViewRole is set to:', currentDevViewRole)
  console.log('  This is overriding your actual admin role')
  
  // Clear the devViewRole
  localStorage.removeItem('devViewRole')
  console.log('✅ Cleared devViewRole from localStorage')
  
  // Verify it's gone
  const verifyCleared = localStorage.getItem('devViewRole')
  console.log('🔍 Verification - devViewRole after clearing:', verifyCleared)
  
  if (verifyCleared === null) {
    console.log('🎉 SUCCESS! devViewRole has been cleared')
    console.log('🔄 Please refresh the page to see admin role restored')
  } else {
    console.log('❌ Failed to clear devViewRole')
  }
} else {
  console.log('✅ devViewRole is not set - this is not the issue')
}

console.log('')
console.log('📋 localStorage after cleanup:')
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i)
  const value = localStorage.getItem(key)
  console.log(`  ${key}: ${value}`)
}

console.log('🔍 === LOCALSTORAGE DEBUG END ===')