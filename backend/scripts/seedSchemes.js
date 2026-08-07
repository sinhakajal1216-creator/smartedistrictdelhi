#!/usr/bin/env node
/*
Seed script for schemes collection.
Usage:
  node scripts/seedSchemes.js ./data/schemes.json
Or via npm script:
  npm run seed-schemes -- ./data/schemes.json

The script is idempotent: it will only INSERT schemes whose title (official service name) does not already exist in the collection.
It will NOT modify or delete existing records.
*/

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Scheme = require('../models/Scheme');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartedistrictdelhi';

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

async function main() {
  const argv = process.argv.slice(2);
  const fileArg = argv[0] || './data/schemes.json';
  const filePath = path.resolve(process.cwd(), fileArg);

  if (!fs.existsSync(filePath)) {
    console.error('Dataset file not found:', filePath);
    console.error('Please provide the JSON dataset path as the first argument.');
    process.exit(1);
  }

  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error('Failed to read dataset file:', e.message);
    process.exit(1);
  }

  let items;
  try {
    items = JSON.parse(raw);
    if (!Array.isArray(items)) throw new Error('Dataset JSON must be an array of scheme objects');
  } catch (e) {
    console.error('Failed to parse JSON:', e.message);
    process.exit(1);
  }

  console.log(`Connecting to MongoDB: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  let inserted = 0;
  let skipped = 0;
  const insertedTitles = [];
  const skippedTitles = [];

  for (const item of items) {
    // accept either 'title' or 'name' from the dataset as the official service name
    const title = (item.title || item.name) && String(item.title || item.name).trim();
    if (!title) {
      console.warn('Skipping item with no title:', JSON.stringify(item).slice(0, 200));
      skipped++;
      continue;
    }

    // Idempotency: do not modify existing records
    const exists = await Scheme.findOne({ title }).lean();
    if (exists) {
      skipped++;
      skippedTitles.push(title);
      continue;
    }

    // Build record using current Scheme model fields
    const record = {
      code: item.code || slugify(title),
      title: title,
      description: item.description || item.summary || '',
      categories: Array.isArray(item.categories) ? item.categories : (item.categories ? [item.categories] : []),
      department: item.department || item.dept || '',
      eligibilityRules: ('eligibilityRules' in item) ? item.eligibilityRules : (('eligibility' in item) ? item.eligibility : null),
      requiredDocuments: ('requiredDocuments' in item) ? item.requiredDocuments : (('documents' in item) ? item.documents : []),
      steps: Array.isArray(item.steps) ? item.steps : (item.steps ? [item.steps] : []),
      officialLink: item.officialLink || item.link || item.url || '',
      published: !!item.published
    };

    try {
      const s = new Scheme(record);
      await s.save();
      inserted++;
      insertedTitles.push(title);
      console.log(`Inserted: ${title}`);
    } catch (e) {
      console.error(`Failed to insert ${title}:`, e.message);
      skipped++;
      skippedTitles.push(title);
    }
  }

  console.log(`\nSeed complete. inserted=${inserted}, skipped=${skipped}`);
  if (insertedTitles.length) console.log('Inserted titles:\n', insertedTitles.join('\n'));
  if (skippedTitles.length) console.log('Skipped titles (already exist or error):\n', skippedTitles.join('\n'));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
