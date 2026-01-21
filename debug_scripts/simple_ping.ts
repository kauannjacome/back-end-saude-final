
const axios = require('axios');

async function main() {
  console.log('🚀 Pinging POST http://localhost:3000/auth ...');
  try {
    await axios.post('http://localhost:3000/auth', { email: 'fake', password: 'fake' });
  } catch (err) {
    if (err.response) {
      console.log(`✅ Base /auth responded with: ${err.response.status} ${err.response.statusText}`);
      if (err.response.status === 404) {
        console.log("❌ CONFIRMED: 404 on /auth too. The ENTRIE controller is missing or not mounted.");
      } else {
        console.log("✅ Base /auth exists.");
      }
    }
  }

  console.log('🚀 Pinging POST http://localhost:3000/auth/impersonate ...');
  try {
    await axios.post('http://localhost:3000/auth/impersonate', {}, {
      headers: {
        Authorization: 'Bearer dummy_token'
      }
    });
  } catch (err) {
    if (err.response) {
      console.log(`✅ /auth/impersonate responded with: ${err.response.status} ${err.response.statusText}`);
      if (err.response.status === 404) {
        console.log("❌ CONFIRMED: 404 Not Found. Route is missing.");
      }
    }
  }
}

main();
