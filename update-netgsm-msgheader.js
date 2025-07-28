// Temporary script to update NETGSM_MSGHEADER environment variable
import { execSync } from 'child_process';

try {
  console.log('Updating NETGSM_MSGHEADER to: ISTETKNLIK');
  
  // Set the environment variable for current session
  process.env.NETGSM_MSGHEADER = 'ISTETKNLIK';
  
  console.log('Current environment variables:');
  console.log('NETGSM_USERCODE:', process.env.NETGSM_USERCODE);
  console.log('NETGSM_MSGHEADER:', process.env.NETGSM_MSGHEADER);
  console.log('NETGSM_PASSWORD:', process.env.NETGSM_PASSWORD ? 'Set' : 'Missing');
  
  console.log('Environment variable updated successfully!');
} catch (error) {
  console.error('Error updating environment variable:', error);
}