// Manual sync script for marketing contacts
import { DatabaseStorage } from './server/storage.js';
import { ResendService } from './server/resend-service.js';

console.log('🚀 Starting marketing contacts sync...');

async function syncAllContacts() {
  try {
    const storage = new DatabaseStorage();
    const resendService = new ResendService();
    
    let syncedCount = 0;
    let errors = 0;

    console.log('📋 Syncing users...');
    
    // Get all users
    const users = await storage.getAllUsers();
    console.log(`Found ${users.length} users to sync`);
    
    for (const user of users) {
      try {
        const userType = user.userType === 'master_admin' || user.userType === 'editor_admin' ? 'admin' : user.userType;
        await storage.syncUserToMarketingContact(user, userType, 'manual_sync');
        
        // Add to Resend audience
        await resendService.addToAudience({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          userType: userType
        });
        
        console.log(`✅ Synced user: ${user.email}`);
        syncedCount++;
      } catch (error) {
        console.error(`❌ Error syncing user ${user.email}:`, error.message);
        errors++;
      }
    }

    console.log('🏢 Syncing partners...');
    
    // Get all partners
    const partners = await storage.getAllPartnersWithUsers();
    console.log(`Found ${partners.length} partners to sync`);
    
    for (const partner of partners) {
      try {
        const user = await storage.getUser(partner.userId);
        if (user) {
          await storage.syncPartnerToMarketingContact(partner, user);
          
          // Add to Resend audience with partner info
          await resendService.addToAudience({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            company: partner.companyName,
            website: partner.website,
            userType: 'partner'
          });
          
          console.log(`✅ Synced partner: ${partner.companyName} (${user.email})`);
          syncedCount++;
        }
      } catch (error) {
        console.error(`❌ Error syncing partner ${partner.companyName}:`, error.message);
        errors++;
      }
    }

    console.log(`\n🎉 Sync completed!`);
    console.log(`✅ Successfully synced: ${syncedCount}`);
    console.log(`❌ Errors: ${errors}`);
    
  } catch (error) {
    console.error('💥 Fatal error during sync:', error);
  }
}

syncAllContacts();