
const axios = require('axios');

async function main() {
  console.log("Testing 127.0.0.1...");
  try {
    await axios.post('http://127.0.0.1:3000/auth', { email: 'x', password: 'x' });
  } catch (err) {
    if (err.response) {
      console.log(`ROOT_AUTH_STATUS: ${err.response.status}`);
    } else {
      console.log(`ROOT_AUTH_STATUS: ERROR ${err.message}`);
    }
  }

  try {
    await axios.post('http://127.0.0.1:3000/auth/impersonate', {}, { headers: { Authorization: 'Bearer x' } });
  } catch (err) {
    if (err.response) {
      console.log(`IMPERSONATE_STATUS: ${err.response.status}`);
    } else {
      console.log(`IMPERSONATE_STATUS: ERROR ${err.message}`);
    }
  }
}
main();
