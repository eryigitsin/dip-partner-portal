// Test script for admin notifications - Production domain compatibility
// This will verify if the session and notification system works correctly

import { db } from './server/db.js';
import { users, notifications } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testAdminNotifications() {
  console.log('🔍 Testing Admin Notification System');
  console.log('=' * 50);
  
  try {
    // Check admin users
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.user_type, 'master_admin'))
      .limit(5);
    
    console.log(`📊 Found ${adminUsers.length} admin users:`);
    adminUsers.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });
    
    // Check notifications for admin users
    for (const admin of adminUsers) {
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.user_id, admin.id))
        .limit(5);
      
      console.log(`📬 ${admin.email}: ${userNotifications.length} notifications`);
      userNotifications.forEach(notification => {
        const readStatus = notification.is_read ? '✓' : '○';
        console.log(`    ${readStatus} ${notification.title} (${notification.created_at})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testAdminNotifications();