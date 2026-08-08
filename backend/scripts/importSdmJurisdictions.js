#!/usr/bin/env node
/**
 * Import SDMJurisdiction records from the official JSON dataset.
 * Usage:
 *   node scripts/importSdmJurisdictions.js ./backend/data/sdm_jurisdictions_2025_official_general_administration.json
 * Defaults to that path if no argument given.
 * Idempotent: upserts by subDivisionCode, does not touch SDMOffice documents.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const SDMJurisdiction = require('../models/SDMJurisdiction');
const SDMOffice = require('../models/SDMOffice');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartedistrictdelhi';

async function main() {
  const argv = process.argv.slice(2);
  const fileArg = argv[0] || './backend/data/sdm_jurisdictions_2025_official_general_administration.json';
  const filePath = path.resolve(process.cwd(), fileArg);

  if (!fs.existsSync(filePath)) {
    console.error('Dataset file not found:', filePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let items = JSON.parse(raw);
  if (!Array.isArray(items)) {
    console.error('Expected an array of jurisdiction records');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  let created = 0;
  let updated = 0;
  const mismatched = [];

  for (const item of items) {
    if (!item.subDivisionCode) {
      console.warn('Skipping item with no subDivisionCode:', item);
      continue;
    }

    // build the document to upsert
    const doc = {
      subDivisionCode: item.subDivisionCode,
      area: item.area || null,
      subDivision: item.subDivision || null,
      administrationType: item.administrationType || null,
      mcdWards: Array.isArray(item.mcdWards) ? item.mcdWards : (item.mcdWards ? [item.mcdWards] : []),
      source: item.source || null,
      sourceUrl: item.sourceUrl || null,
      sourceDate: item.sourceDate || null,
      notes: item.notes || null
    };

    // link to SDMOffice by code if possible
    const office = await SDMOffice.findOne({ code: item.subDivisionCode }).lean();
    if (office) {
      doc.linkedOfficeCode = office.code;
    } else {
      // try to match by subDivision name fuzzy (case-insensitive exact)
      const officeByName = await SDMOffice.findOne({ title: new RegExp('^' + escapeRegExp(item.subDivision) + '$', 'i') }).lean();
      if (officeByName) {
        doc.linkedOfficeCode = officeByName.code;
      } else {
        mismatched.push(item.subDivisionCode);
      }
    }

    const res = await SDMJurisdiction.findOneAndUpdate({ subDivisionCode: item.subDivisionCode }, doc, { upsert: true, new: true, setDefaultsOnInsert: true });
    if (res) {
      // determine whether it was created or updated
      // findOneAndUpdate returns the document; to check creation, we can check whether createdAt equals updatedAt
      if (res.createdAt && res.updatedAt && res.createdAt.getTime() === res.updatedAt.getTime()) created++;
      else updated++;
    }
  }

  console.log(`Import complete. created=${created}, updated=${updated}, mismatched=${mismatched.length}`);
  if (mismatched.length) console.log('Unlinked subDivisionCodes:', mismatched.join(', '));

  const count = await SDMJurisdiction.countDocuments();
  console.log('Total jurisdiction records in DB:', count);

  await mongoose.disconnect();
  process.exit(0);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
