const bcrypt = require('bcryptjs');
bcrypt.hash('123456', 6).then(h => console.log('HASH:' + h));
