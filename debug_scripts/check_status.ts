
const axios = require('axios');

async function main() {
  try {
    await axios.post('http://localhost:3000/auth', { email: 'x', password: 'x' });
  } catch (err) {
    // We expect 401 or 400. If 404, then controller is missing.
    if (err.response) {
      console.log(`ROOT_AUTH_STATUS: ${err.response.status}`);
    } else {
      console.log(`ROOT_AUTH_STATUS: ERROR ${err.message}`);
    }
  }

  try {
    await axios.post('http://localhost:3000/auth/impersonate', {}, { headers: { Authorization: 'Bearer x' } });
  } catch (err) {
    if (err.response) {
      console.log(`IMPERSONATE_STATUS: ${err.response.status}`);
    } else {
      console.log(`IMPERSONATE_STATUS: ERROR ${err.message}`);
    }
  }
}
main();
