// Test script to submit a partner application and verify Resend email integration
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testPartnerApplication() {
  try {
    const formData = new FormData();
    
    // Application data
    formData.append('firstName', 'Test');
    formData.append('lastName', 'Partner');
    formData.append('email', 'test.partner@example.com');
    formData.append('phone', '+905551234567');
    formData.append('company', 'Test Şirketi');
    formData.append('contactPerson', 'Test Partner');
    formData.append('username', 'testpartner2025');
    formData.append('website', 'https://test-sirket.com');
    formData.append('serviceCategory', 'E-Ticaret Altyapısı');
    formData.append('businessDescription', 'Test amaçlı oluşturulan partner başvurusu');
    formData.append('companySize', '10-50');
    formData.append('foundingYear', '2020');
    formData.append('sectorExperience', '5');
    formData.append('targetMarkets', 'Türkiye, Avrupa');
    formData.append('services', 'E-ticaret platformu kurulumu ve yönetimi');
    formData.append('dipAdvantages', 'Hızlı teslimat ve 7/24 destek');
    formData.append('whyPartner', 'DİP Platform ile birlikte büyümek istiyoruz');
    formData.append('references', 'Daha önce 50+ e-ticaret sitesi kurulumu');
    formData.append('linkedinProfile', 'https://linkedin.com/company/test-sirket');
    
    const response = await fetch('http://localhost:5000/api/partner-applications', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Partner application submitted successfully!');
      console.log('Application ID:', result.id);
      console.log('Status:', result.status);
      console.log('\n📧 Check your email for notifications:');
      console.log('- Admin email should receive new application notification');
      console.log('- Applicant email should receive confirmation email');
      console.log('- Contact should be added to Resend audience');
    } else {
      console.error('❌ Application failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

console.log('🚀 Testing Partner Application with Resend Integration...\n');
testPartnerApplication();