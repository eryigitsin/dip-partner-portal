#!/usr/bin/env node

// Test script to create admin notifications for testing production visibility

import https from 'https';
import http from 'http';

console.log('🔬 Admin Notifications Test Script - Production vs Development');
console.log('===========================================================');

// Test production environment first
async function testNotificationCreation(domain, isProduction = false) {
  console.log(`\n📋 Testing ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} Environment: ${domain}`);
  console.log('-----------------------------------------------------------');
  
  const protocol = isProduction ? https : (domain.includes('localhost') ? http : https);
  const port = domain.includes('localhost') ? (domain.includes(':') ? domain.split(':')[1] : '5000') : (isProduction ? 443 : 443);
  const hostname = domain.includes('localhost') ? (domain.includes(':') ? domain.split(':')[0] : domain) : domain;
  
  try {
    // Test 1: Check authentication debug endpoint
    console.log(`1️⃣ Testing authentication debug endpoint...`);
    const debugResponse = await makeRequest(protocol, hostname, port, '/api/auth/debug', 'GET', null, isProduction);
    
    if (debugResponse.data) {
      console.log(`   ✅ Debug endpoint accessible`);
      console.log(`   📊 Environment: ${debugResponse.data.environment?.NODE_ENV || 'UNKNOWN'}`);
      console.log(`   🔐 Authentication: ${debugResponse.data.authentication?.isAuthenticated ? 'YES' : 'NO'}`);
      console.log(`   🍪 Session: ${debugResponse.data.authentication?.hasSession ? 'EXISTS' : 'MISSING'}`);
      console.log(`   🌐 Domain: ${debugResponse.data.environment?.domain || 'UNKNOWN'}`);
    } else {
      console.log(`   ❌ Debug endpoint failed: ${debugResponse.error}`);
    }
    
    // Test 2: Test CORS preflight
    console.log(`\n2️⃣ Testing CORS preflight...`);
    const corsResponse = await makeRequest(protocol, hostname, port, '/api/notifications', 'OPTIONS', null, isProduction);
    console.log(`   ${corsResponse.statusCode === 200 ? '✅' : '❌'} CORS preflight: ${corsResponse.statusCode}`);
    
    // Test 3: Test notifications endpoint (without auth - should get 401)
    console.log(`\n3️⃣ Testing notifications endpoint (unauthenticated)...`);
    const notifyResponse = await makeRequest(protocol, hostname, port, '/api/notifications', 'GET', null, isProduction);
    console.log(`   ${notifyResponse.statusCode === 401 ? '✅' : '❌'} Unauthenticated access: ${notifyResponse.statusCode} (expected 401)`);
    
    // Test 4: Test environment variables effect
    console.log(`\n4️⃣ Environment Impact Analysis:`);
    if (debugResponse.data) {
      const envData = debugResponse.data.environment;
      const sessionConfig = debugResponse.data.sessionConfig;
      
      console.log(`   NODE_ENV: ${envData?.NODE_ENV || 'MISSING'} ${envData?.NODE_ENV === 'production' ? '✅' : '⚠️'}`);
      console.log(`   Production Mode: ${envData?.isProduction ? 'ENABLED ✅' : 'DISABLED ⚠️'}`);
      console.log(`   Cookie Domain: ${sessionConfig?.cookieDomain}`);
      console.log(`   Cookie Secure: ${sessionConfig?.cookieSecure}`);
      console.log(`   Cookie SameSite: ${sessionConfig?.cookieSameSite}`);
      
      if (!envData?.isProduction && isProduction) {
        console.log(`   🚨 WARNING: Production domain but NODE_ENV != 'production'!`);
        console.log(`   📝 SOLUTION: Set NODE_ENV=production in production environment`);
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
  }
}

function makeRequest(protocol, hostname, port, path, method, data, isHttps = false) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: isHttps || protocol === https ? (port === '80' ? 443 : port) : port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Origin': `${isHttps || protocol === https ? 'https' : 'http'}://${hostname}${port && port !== '80' && port !== '443' ? ':' + port : ''}`,
        'User-Agent': 'Admin-Notification-Test/1.0'
      }
    };
    
    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = protocol.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : null;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData,
            error: e.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  // Test development environment
  await testNotificationCreation('localhost:5000', false);
  
  // Test production environment 
  await testNotificationCreation('partner.dip.tc', true);
  
  console.log('\n🏁 Test Summary:');
  console.log('===============');
  console.log('1. Check if NODE_ENV=production is set in production');
  console.log('2. Verify session configuration differences between environments');
  console.log('3. Confirm CORS headers are properly configured');
  console.log('4. Test authentication flow in both environments');
  console.log('\n💡 Next Steps:');
  console.log('- Set NODE_ENV=production in production environment');
  console.log('- Verify HTTPS is enabled for secure cookies');
  console.log('- Test with actual authenticated session');
}

runTests().catch(console.error);