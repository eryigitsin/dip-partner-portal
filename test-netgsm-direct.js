// Direct NetGSM API test with curl command generation
import { createNetGsmService } from './server/netgsm.ts';

const service = createNetGsmService();

if (!service) {
  console.log('NetGSM service not configured');
  process.exit(1);
}

// Generate test parameters
const phone = '5054783351';
const code = service.generateOtpCode();
const message = `DIP doğrulama kodunuz: ${code}`;

const params = new URLSearchParams({
  usercode: '8503071245',
  password: 'Xceetc181920-',
  no: phone,
  msg: message,
  msgheader: 'ISTETKNLIK',
  encoding: 'TR',
  iysfilter: '0'
});

console.log('Test parameters:');
console.log(Object.fromEntries(params));

console.log('\nGenerated curl command:');
console.log(`curl -X POST 'https://api.netgsm.com.tr/bulkhttppost.asp' \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -H 'Accept: text/plain' \\
  -d '${params.toString()}'`);

console.log('\nAlternative with different endpoint:');
console.log(`curl -X POST 'https://api.netgsm.com.tr/sms/send/xml' \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -d '${params.toString()}'`);