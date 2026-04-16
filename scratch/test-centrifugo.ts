import axios from 'axios';

async function testCentrifugo() {
  const apiUrl = 'http://localhost:8000/api';
  const apiKey = 'centrifugo-api-secret-key';
  
  console.log('Testing Centrifugo Publish API...');
  
  try {
    // Try standard Centrifugo v3+ API format
    const res = await axios.post(apiUrl, {
      method: 'publish',
      params: {
        channel: 'property:test:likes',
        data: { test: true }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      }
    });
    
    console.log('Standard API Response:', JSON.stringify(res.data));
  } catch (err) {
    console.error('Standard API Error:', err.message);
  }

  try {
    // Try the format currently used in centrifugo.service.ts
    const res = await axios.post(`${apiUrl}/publish`, {
      channel: 'property:test:likes',
      data: { test: true }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      }
    });
    
    console.log('Legacy API Response:', JSON.stringify(res.data));
  } catch (err) {
    console.error('Legacy API Error:', err.message);
  }
}

testCentrifugo();
