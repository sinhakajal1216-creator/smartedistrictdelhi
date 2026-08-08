#!/usr/bin/env node
/*
 Apply eligibility rules from a JSON file into existing Scheme documents.
 Usage:
   node scripts/applyEligibilityRules.js ./data/eligibilityRules.json
 The script is idempotent and will update the field `eligibilityRules` on matched schemes.
*/

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Scheme = require('../models/Scheme');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartedistrictdelhi';

function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

async function main() {
  const argv = process.argv.slice(2);
  const fileArg = argv[0] || './data/eligibilityRules.json';
  const filePath = path.resolve(process.cwd(), fileArg);

  if (!fs.existsSync(filePath)) {
    console.error('Rules file not found:', filePath);
    process.exit(1);
  }

  let raw;
  try { raw = fs.readFileSync(filePath, 'utf8'); } catch (e) { console.error('Failed to read file:', e.message); process.exit(1); }
  let items;
  try { items = JSON.parse(raw); if (!Array.isArray(items)) throw new Error('JSON must be an array'); } catch (e) { console.error('Failed to parse JSON:', e.message); process.exit(1); }

  console.log(`Connecting to MongoDB: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  let updated = 0, matched = 0, notFound = 0;

  for (const item of items) {
    const schemeName = (item.schemeName || item.title || item.name || '').trim();
    const rules = item.rules || null; // preserve structure exactly as provided
    if (!rules) {
      console.warn('Skipping item with no rules:', schemeName || JSON.stringify(item).slice(0,60));
      continue;
    }

    let scheme = null;
    const codeRaw = (item.code || item.schemeCode || '');
    const code = (codeRaw === null || codeRaw === undefined) ? null : String(codeRaw).trim();
    if (code) {
      scheme = await Scheme.findOne({ code: code }).exec();
      if (!scheme) {
        console.warn(`No matching scheme for code: ${code}, schemeName: ${schemeName}`);
      }
    }

    if (!scheme && schemeName) {
      // match by title case-insensitively, ignoring surrounding whitespace
      scheme = await Scheme.findOne({ title: new RegExp('^' + escapeRegex(schemeName) + '$', 'i') }).exec();
    }

    if (!scheme) {
      console.warn(`No matching scheme for code/title: ${code || '(no code)'} , schemeName: ${schemeName || '(no name)'}`);
      notFound++;
      continue;
    }

    matched++;
    // Determine if update needed
    const existing = scheme.eligibilityRules || null;
    const equal = JSON.stringify(existing) === JSON.stringify(rules);
    if (equal) {
      console.log(`No change: ${scheme.title}`);
      continue;
    }

    // store rules exactly under eligibilityRules
    scheme.eligibilityRules = rules;
    try {
      await scheme.save();
      console.log(`Updated: ${scheme.title}`);
      updated++;
    } catch (e) {
      console.error(`Failed to update ${scheme.title}:`, e.message);
    }
  }

  console.log(`
Done. matched=${matched}, updated=${updated}, notFound=${notFound}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(2); });
