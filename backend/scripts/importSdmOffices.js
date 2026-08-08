#!/usr/bin/env node
/**
 * Import SDM offices from a JSON dataset into the SDMOffice collection.
 * Usage:
 *   node scripts/importSdmOffices.js ./backend/data/sdm_offices.json
 * If no path given, defaults to ./backend/data/sdm_offices_delhi_post_2025_reorganisation.json
 *
 * Idempotent: uses `code` when available, otherwise matches by `name` + `pincode` to avoid duplicates.
 * Keeps nulls as-is and does not invent missing data.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const SDMOffice = require('../models/SDMOffice');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartedistrictdelhi';

function normalizeString(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return String(v).trim();
}

function toNumberOrNull(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapItem(item) {
  // conservative mapping: prefer explicit field names, but tolerate common variants
  const code = normalizeString(item.code || item.code_id || item.office_code || item.officeCode || item.id || item.sdmo_code || item.sdm_code);
  const name = normalizeString(item.name || item.office_name || item.officeName || item.sdm_name || item.sdmName || item.title);
  const fullAddress = normalizeString(item.fullAddress || item.address || item.office_address || item.full_address || item.addr || item.location);
  const pincode = normalizeString(item.pincode || item.postcode || item.postal_code || item.postal || item.pin);
  const locality = normalizeString(item.locality || item.locality_name || item.area || item.neighbourhood);
  const ward = normalizeString(item.ward || item.ward_no || item.wardNumber || item.wardName);
  const jurisdiction = (item.jurisdiction && typeof item.jurisdiction === 'object') ? item.jurisdiction : (item.jurisdiction ? normalizeString(item.jurisdiction) : undefined);
  const verificationTimings = normalizeString(item.verificationTimings || item.verification_timings || item.timings || item.office_timings);
  const workingDays = Array.isArray(item.workingDays) ? item.workingDays : (Array.isArray(item.working_days) ? item.working_days : (item.workingDays ? [item.workingDays] : undefined));
  const phone = normalizeString(item.phone || item.contact || item.telephone || item.phone_number || item.phoneNumber);
  const email = normalizeString(item.email || item.mail || item.contact_email || item.email_address);
  const latitude = (item.latitude !== undefined || item.lat !== undefined) ? toNumberOrNull(item.latitude || item.lat) : undefined;
  const longitude = (item.longitude !== undefined || item.lon !== undefined || item.lng !== undefined) ? toNumberOrNull(item.longitude || item.lon || item.lng) : undefined;
  const notes = normalizeString(item.notes || item.remarks || item.note);

  // jurisdiction: if it's an object with arrays, normalize to { pincodes, wards, localities }
  let jurisdictionObj = undefined;
  if (jurisdiction && typeof jurisdiction === 'object' && !Array.isArray(jurisdiction)) {
    jurisdictionObj = {
      pincodes: jurisdiction.pincodes || jurisdiction.postcodes || jurisdiction.postal_codes || jurisdiction.pin_codes || jurisdiction.postal || [],
      wards: jurisdiction.wards || jurisdiction.ward || jurisdiction.ward_numbers || [],
      localities: jurisdiction.localities || jurisdiction.locality || jurisdiction.areas || []
    };
  }

  return {
    code: code === undefined ? undefined : code,
    name: name === undefined ? undefined : name,
    fullAddress: fullAddress === undefined ? undefined : fullAddress,
    pincode: pincode === undefined ? undefined : pincode,
    locality: locality === undefined ? undefined : locality,
    ward: ward === undefined ? undefined : ward,
    jurisdiction: jurisdictionObj === undefined ? undefined : jurisdictionObj,
    verificationTimings: verificationTimings === undefined ? undefined : verificationTimings,
    workingDays: workingDays === undefined ? undefined : workingDays,
    phone: phone === undefined ? undefined : phone,
    email: email === undefined ? undefined : email,
    latitude: latitude === undefined ? undefined : latitude,
    longitude: longitude === undefined ? undefined : longitude,
    notes: notes === undefined ? undefined : notes
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const fileArg = argv[0] || './backend/data/sdm_offices_delhi_post_2025_reorganisation.json';
  const filePath = path.resolve(process.cwd(), fileArg);

  if (!fs.existsSync(filePath)) {
    console.error('Dataset file not found:', filePath);
    console.error('Please place the JSON file at the path or pass it as the first argument.');
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
    if (!Array.isArray(items)) {
      // support a top-level object with array under 'offices' or similar
      if (Array.isArray(items.offices)) items = items.offices;
      else if (Array.isArray(items.data)) items = items.data;
      else throw new Error('Dataset JSON must be an array of office objects');
    }
  } catch (e) {
    console.error('Failed to parse JSON:', e.message);
    process.exit(1);
  }

  console.log(`Connecting to MongoDB: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  let inserted = 0;
  let skipped = 0;
  const skippedReasons = [];

  for (const rawItem of items) {
    const mapped = mapItem(rawItem);

    // validation: must have a name
    if (!mapped.name) {
      console.warn('Skipping item with no name:', JSON.stringify(rawItem).slice(0, 200));
      skipped++;
      skippedReasons.push('no-name');
      continue;
    }

    // build filter for idempotency
    let filter = null;
    if (mapped.code) {
      filter = { code: mapped.code };
    } else {
      // if no code, try exact name + pincode match
      filter = { name: mapped.name };
      if (mapped.pincode) filter.pincode = mapped.pincode;
    }

    try {
      const exists = await SDMOffice.findOne(filter).lean();
      if (exists) {
        skipped++;
        skippedReasons.push('exists');
        continue;
      }

      // Create document but only set fields that are defined (preserve undefined so Mongoose omits them)
      const doc = {};
      const keys = ['code','name','fullAddress','pincode','locality','ward','jurisdiction','verificationTimings','workingDays','phone','email','latitude','longitude','notes'];
      for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(mapped, k)) {
          // keep null as null; set undefined fields are skipped
          doc[k] = mapped[k] === undefined ? undefined : mapped[k];
        }
      }

      const created = new SDMOffice(doc);
      await created.save();
      inserted++;
    } catch (e) {
      console.error('Failed to insert item:', mapped.name, e.message);
      skipped++;
      skippedReasons.push('error');
    }
  }

  console.log(`\nImport complete. inserted=${inserted}, skipped=${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
