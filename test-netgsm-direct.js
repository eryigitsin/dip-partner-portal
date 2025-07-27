const { createNetGsmService } = require('./server/netgsm.ts');

async function testSMS() {
  const service = createNetGsmService();
  if (!service) {
    console.log('NetGSM service not configured');
    return;
  }
  
  const phone = '905054783351';
  const code = '123456';
  
  console.log('Testing SMS send...');
  const result = await service.sendOtpSms(phone, code);
  console.log('Result:', result);
}

testSMS();