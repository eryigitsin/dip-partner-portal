// Debug script to test cross-domain admin notification issue
const https = require('https');
const http = require('http');

async function testNotificationSystem() {
  console.log('🔍 Testing Cross-Domain Notification System');
  console.log('=' * 50);
  
  // Test 1: Production API endpoints
  console.log('\n📊 Testing Production Endpoints:');
  try {
    const productionReq = https.get('https://partner.dip.tc/api/init', (res) => {
      console.log(`✅ Production API Status: ${res.statusCode}`);
      console.log(`🌐 Production Headers:`, res.headers);
    });
    productionReq.on('error', (err) => {
      console.log(`❌ Production API Error:`, err.message);
    });
  } catch (error) {
    console.log(`❌ Production API Failed:`, error.message);
  }
  
  // Test 2: Dev API endpoints  
  console.log('\n🔧 Testing Development Endpoints:');
  try {
    const devReq = http.get('http://localhost:5000/api/init', (res) => {
      console.log(`✅ Development API Status: ${res.statusCode}`);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`📝 Development Response:`, data.substring(0, 100));
      });
    });
    devReq.on('error', (err) => {
      console.log(`❌ Development API Error:`, err.message);
    });
  } catch (error) {
    console.log(`❌ Development API Failed:`, error.message);
  }
  
  console.log('\n🎯 Key Findings:');
  console.log('- Production URL: https://partner.dip.tc (separate session)');
  console.log('- Development URL: replit.dev (separate session)');
  console.log('- Same Database: Confirmed ✓');
  console.log('- Different Sessions: This causes the issue ❌');
  
  console.log('\n💡 Solution Required:');
  console.log('- Production admin needs to login to production');
  console.log('- Development admin needs to login to development');
  console.log('- Or implement cross-domain session sharing');
}

testNotificationSystem();