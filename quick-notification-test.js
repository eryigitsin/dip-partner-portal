// Quick test to run in browser console on https://partner.dip.tc
// This will help us understand exactly what's happening with notifications

console.log('🔬 Notification Visibility Test Started');

// Test 1: Check if user is authenticated
async function checkAuth() {
  try {
    const response = await fetch('/api/auth/user');
    const user = await response.json();
    console.log('✅ User authenticated:', user);
    return user;
  } catch (error) {
    console.log('❌ Authentication failed:', error);
    return null;
  }
}

// Test 2: Check notification count
async function checkNotifications() {
  try {
    const response = await fetch('/api/notifications/unread-count');
    const data = await response.json();
    console.log('✅ Notification count:', data);
    return data;
  } catch (error) {
    console.log('❌ Notification count failed:', error);
    return null;
  }
}

// Test 3: Check DOM elements
function checkDOMElements() {
  const bellButton = document.querySelector('[data-testid="button-notifications"]');
  const badge = document.querySelector('[data-testid="button-notifications"] .bg-red-500');
  const messageButton = document.querySelector('[data-testid="button-messages"]');
  
  console.log('🔍 DOM Elements:');
  console.log('  Bell button:', bellButton ? '✅ Found' : '❌ Not found');
  console.log('  Notification badge:', badge ? '✅ Found' : '❌ Not found');
  console.log('  Message button:', messageButton ? '✅ Found' : '❌ Not found');
  
  if (bellButton) {
    console.log('  Bell button styles:', window.getComputedStyle(bellButton));
  }
  
  return { bellButton, badge, messageButton };
}

// Test 4: Check user type and permissions
function checkUserType(user) {
  if (!user) return;
  
  console.log('👤 User Details:');
  console.log('  User Type:', user.userType || user.activeUserType);
  console.log('  Available Types:', user.availableUserTypes);
  console.log('  Email:', user.email);
  console.log('  ID:', user.id);
  
  // Check if user should see notifications
  const shouldSeeNotifications = ['master_admin', 'editor_admin', 'partner'].includes(user.userType || user.activeUserType);
  console.log('  Should see notifications:', shouldSeeNotifications ? '✅ Yes' : '❌ No');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running all tests...\n');
  
  const user = await checkAuth();
  await checkNotifications();
  checkDOMElements();
  checkUserType(user);
  
  console.log('\n🏁 Test completed. Check results above.');
  console.log('\nIf notification button is missing, the user might not have the right permissions.');
  console.log('If API calls fail, there might be a session/authentication issue.');
  console.log('If everything looks good but notifications aren\'t visible, it might be a CSS/styling issue.');
}

// Auto-run the test
runAllTests();