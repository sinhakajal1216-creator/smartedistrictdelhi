#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');

const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartedistrictdelhi';

async function main() {
  const argv = process.argv.slice(2);
  // Usage: node scripts/seedAdmin.js email@example.com password
  const email = argv[0] || process.env.ADMIN_EMAIL;
  const password = argv[1] || process.env.ADMIN_PASSWORD;

  if (!email) {
    console.error('Usage: node scripts/seedAdmin.js <email> [password]');
    console.error('Or set ADMIN_EMAIL and ADMIN_PASSWORD in environment');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    let user = await User.findOne({ email });
    if (user) {
      if (!Array.isArray(user.roles)) user.roles = [];
      if (!user.roles.includes('admin')) {
        user.roles.push('admin');
        await user.save();
        console.log(`Updated existing user ${email} with 'admin' role.`);
      } else {
        console.log(`User ${email} already has 'admin' role.`);
      }
    } else {
      if (!password) {
        console.error('No user found and no password provided to create new admin. Provide a password as the second argument.');
        process.exit(1);
      }
      const hash = await bcrypt.hash(password, 10);
      user = new User({ name: 'Admin', email, passwordHash: hash, roles: ['admin'] });
      await user.save();
      console.log(`Created new admin user ${email}.`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(2);
  }
}

main();
