// Test file upload directly
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  const form = new FormData();
  
  // Create a simple test image buffer
  const buffer = Buffer.from('test image data');
  form.append('logo', buffer, {
    filename: 'test-logo.jpg',
    contentType: 'image/jpeg'
  });
  form.append('description', 'test description');
  
  try {
    const response = await fetch('http://localhost:5000/api/partners/1', {
      method: 'PATCH',
      body: form,
      headers: {
        ...form.getHeaders(),
        'Cookie': 'connect.sid=s%3AwOPpX9xZrUNgFuQCaP8K3lJ88XvYJiAf.kVhQU%2FH5FvEcXbP5z5mwLQxXQkXzYF%2BfBYJnXQ0dHDA' // Add your session cookie here
      }
    });
    
    const data = await response.json();
    console.log('Response:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testUpload();