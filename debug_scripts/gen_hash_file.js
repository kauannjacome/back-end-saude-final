const bcrypt = require('bcryptjs');
bcrypt.hash('123456', 6).then(h => {
  const fs = require('fs');
  fs.writeFileSync('hash.txt', h);
});
