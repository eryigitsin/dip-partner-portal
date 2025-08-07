#!/usr/bin/env node

// Production Environment Debug Script for Notification System
// This script tests the critical components that may cause notification issues in production

console.log('🔍 Production Debug Test - Notification System Compatibility');
console.log('============================================================');

// Test 1: Environment Variables Check
console.log('\n1️⃣ Environment Variables Check:');
const criticalEnvVars = [
  'NODE_ENV',
  'DATABASE_URL', 
  'SESSION_SECRET',
  'REPLIT_DOMAINS'
];

criticalEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  const status = value ? '✅' : '❌';
  const displayValue = envVar === 'SESSION_SECRET' || envVar === 'DATABASE_URL' 
    ? (value ? `${value.substring(0, 10)}...` : 'MISSING') 
    : value || 'MISSING';
  
  console.log(`   ${status} ${envVar}: ${displayValue}`);
});

// Test 2: Production Mode Detection
console.log('\n2️⃣ Production Mode Detection:');
const isProduction = process.env.NODE_ENV === 'production';
console.log(`   Production Mode: ${isProduction ? '✅ ENABLED' : '❌ DISABLED (development)'}`);

// Test 3: Domain Configuration
console.log('\n3️⃣ Domain Configuration:');
const domains = process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(',') : [];
console.log(`   Configured Domains: ${domains.length > 0 ? domains.join(', ') : '❌ No domains configured'}`);

// Test 4: Session Configuration Simulation
console.log('\n4️⃣ Session Configuration (Simulated):');
console.log(`   Cookie Domain: ${isProduction ? '.dip.tc' : 'undefined (localhost)'}`);
console.log(`   Cookie Secure: ${isProduction ? 'true (HTTPS only)' : 'false (HTTP allowed)'}`);
console.log(`   Cookie SameSite: ${isProduction ? 'none (cross-site)' : 'lax (same-site)'}`);
console.log(`   Trust Proxy: ${isProduction ? 'true' : '1'}`);

// Test 5: Database Pool Configuration
console.log('\n5️⃣ Database Pool Configuration:');
console.log(`   Max Connections: ${isProduction ? '20' : '10'}`);
console.log(`   Connection Timeout: 5000ms`);
console.log(`   Query Timeout: 10000ms`);

// Test 6: CORS Configuration
console.log('\n6️⃣ CORS Configuration:');
const allowedOrigins = [
  'http://localhost:5000',
  'https://partner.dip.tc',
  'https://dip.tc',
  'http://localhost:3000',
  'http://127.0.0.1:5000'
];
console.log(`   Allowed Origins: ${allowedOrigins.join(', ')}`);
console.log(`   Credentials Allowed: true`);

// Test 7: Recommendations
console.log('\n7️⃣ Production Recommendations:');
console.log('   ✅ Set NODE_ENV=production in production environment');
console.log('   ✅ Ensure HTTPS is enabled for secure cookies');
console.log('   ✅ Configure .dip.tc domain for cross-subdomain sessions');
console.log('   ✅ Verify database connection pool limits');
console.log('   ✅ Check CORS headers in browser dev tools');
console.log('   ✅ Verify session cookies are being set with correct attributes');

// Test 8: Quick Health Check Command
console.log('\n8️⃣ Production Health Check Commands:');
console.log('   # Test API authentication:');
console.log('   curl -X GET https://partner.dip.tc/api/notifications -H "Cookie: [your-session-cookie]" -v');
console.log('   ');
console.log('   # Check CORS headers:');
console.log('   curl -X OPTIONS https://partner.dip.tc/api/notifications -H "Origin: https://partner.dip.tc" -v');
console.log('   ');
console.log('   # Test session endpoint:');
console.log('   curl -X GET https://partner.dip.tc/api/auth/debug -H "Cookie: [your-session-cookie]" -v');

console.log('\n🏁 Debug test completed. Review the output for any ❌ items that need attention.');