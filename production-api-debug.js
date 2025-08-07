// Production API Debug - Check what's actually being returned
console.log('🔍 Production API Response Debug');

// Test API responses raw
async function debugAPIResponses() {
  console.log('Testing /api/auth/user...');
  try {
    const authResponse = await fetch('/api/auth/user');
    console.log('Auth Response Status:', authResponse.status);
    console.log('Auth Response Headers:', Object.fromEntries(authResponse.headers.entries()));
    
    const authText = await authResponse.text();
    console.log('Auth Response (raw text):', authText.substring(0, 500));
    
    try {
      const authJSON = JSON.parse(authText);
      console.log('✅ Auth Response (JSON):', authJSON);
    } catch (e) {
      console.log('❌ Auth Response is not valid JSON');
    }
  } catch (error) {
    console.log('❌ Auth request failed:', error);
  }

  console.log('\nTesting /api/notifications/unread-count...');
  try {
    const notifResponse = await fetch('/api/notifications/unread-count');
    console.log('Notification Response Status:', notifResponse.status);
    console.log('Notification Response Headers:', Object.fromEntries(notifResponse.headers.entries()));
    
    const notifText = await notifResponse.text();
    console.log('Notification Response (raw text):', notifText.substring(0, 500));
    
    try {
      const notifJSON = JSON.parse(notifText);
      console.log('✅ Notification Response (JSON):', notifJSON);
    } catch (e) {
      console.log('❌ Notification Response is not valid JSON');
    }
  } catch (error) {
    console.log('❌ Notification request failed:', error);
  }

  // Check cookies
  console.log('\nCookies:', document.cookie);
  
  // Check current URL
  console.log('Current URL:', window.location.href);
}

debugAPIResponses();