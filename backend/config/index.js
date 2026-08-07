const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

module.exports = {
  port: process.env.PORT || 4000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smartedistrictdelhi',
  jwtSecret: process.env.JWT_SECRET || 'replace-me-with-secure-secret'
};
