#!/usr/bin/env node
/**
 * Apply exact mappings from SDMJurisdiction.subDivisionCode -> SDMOffice.code
 * Usage: node scripts/linkJurisdictionsToOffices.js
 * Idempotent: only sets linkedOfficeCode if SDMOffice code exists and it's not already set to that value.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const SDMJurisdiction = require('../models/SDMJurisdiction');
const SDMOffice = require('../models/SDMOffice');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartedistrictdelhi';

const mappings = {
  "SOUTH-EAST-JANGPURA": "SO-JANGPURA",
  "SOUTH-EAST-KALKAJI": "SO-KALKAJI",
  "SOUTH-EAST-BADARPUR": "SO-BADARPUR",

  "OLD-DELHI-SADAR-BAZAR": "OL-SADAR-BAZAR",
  "OLD-DELHI-CHANDNI-CHOWK": "OL-CHANDNI-CHOWK",

  "NORTH-BURARI": "NO-BURARI",
  "NORTH-ADARSH-NAGAR": "NO-ADARSH-NAGAR",
  "NORTH-BADLI": "NO-BADLI",

  "NEW-DELHI-DELHI-CANTT": "NE-DELHI-CANTT",
  "NEW-DELHI-NEW-DELHI": "NE-NEW-DELHI",

  "CENTRAL-PATEL-NAGAR": "CE-PATEL-NAGAR",
  "CENTRAL-KAROL-BAGH": "CE-KAROL-BAGH",

  "CENTRAL-NORTH-SHAKUR-BASTI": "CE-SHAKUR-BASTI",
  "CENTRAL-NORTH-SHALIMAR-BAGH": "CE-SHALIMAR-BAGH",
  "CENTRAL-NORTH-MODEL-TOWN": "CE-MODEL-TOWN",

  "SOUTH-WEST-NAJAFGARH": "SO-NAJAFGARH",
  "SOUTH-WEST-MATIALA": "SO-MATIALA",
  "SOUTH-WEST-DWARKA": "SO-DWARKA",
  "SOUTH-WEST-BIJWASAN": "SO-BIJWASAN",

  "OUTER-NORTH-MUNDKA": "OU-MUNDKA",
  "OUTER-NORTH-NARELA": "OU-NARELA",
  "OUTER-NORTH-BAWANA": "OU-BAWANA",

  "NORTH-WEST-KIRARI": "NO-KIRARI",
  "NORTH-WEST-NANGLOI-JAT": "NO-NANGLOI-JAT",
  "NORTH-WEST-ROHINI": "NO-ROHINI",

  "NORTH-EAST-KARAWAL-NAGAR": "NO-KARAWAL-NAGAR",
  "NORTH-EAST-GOKALPUR": "NO-GOKALPUR",
  "NORTH-EAST-YAMUNA-VIHAR": "NO-YAMUNA-VIHAR",
  "NORTH-EAST-SHAHDARA": "NO-SHAHDARA",

  "EAST-GANDHI-NAGAR": "EA-GANDHI-NAGAR",
  "EAST-VISHWAS-NAGAR": "EA-VISHWAS-NAGAR",
  "EAST-PATPARGANJ": "EA-PATPARGANJ",

  "SOUTH-CHHATARPUR": "SO-CHHATARPUR",
  "SOUTH-MALVIYA-NAGAR": "SO-MALVIYA-NAGAR",
  "SOUTH-DEOLI": "SO-DEOLI",
  "SOUTH-MEHRAULI": "SO-MEHRAULI",

  "WEST-VIKASPURI": "WE-VIKASPURI",
  "WEST-JANAKPURI": "WE-JANAKPURI",
  "WEST-RAJOURI-GARDEN": "WE-RAJOURI-GARDEN"
};

async function main(){
  await mongoose.connect(MONGODB_URI, { useNewUrlParser:true, useUnifiedTopology:true });
  const results = { applied:0, skippedAlreadySet:0, missingOffice:[], missingJurisdiction:[] };

  for(const [subDiv, officeCode] of Object.entries(mappings)){
    const officeExists = await SDMOffice.findOne({ code: officeCode }).lean();
    if (!officeExists){
      results.missingOffice.push({ subDivisionCode: subDiv, officeCode });
      continue;
    }
    const jur = await SDMJurisdiction.findOne({ subDivisionCode: subDiv });
    if (!jur){
      results.missingJurisdiction.push(subDiv);
      continue;
    }
    if (jur.linkedOfficeCode === officeCode){
      results.skippedAlreadySet++;
      continue;
    }
    jur.linkedOfficeCode = officeCode;
    await jur.save();
    results.applied++;
  }

  // verification
  const total = await SDMJurisdiction.countDocuments();
  const withLinked = await SDMJurisdiction.countDocuments({ linkedOfficeCode: { $exists: true, $ne: null } });
  const withoutLinked = total - withLinked;

  // invalid linked codes (point to non-existent SDMOffice)
  const allLinked = await SDMJurisdiction.find({ linkedOfficeCode: { $exists:true, $ne:null } }).lean();
  const invalids = [];
  const codeCounts = {};
  for(const j of allLinked){
    codeCounts[j.linkedOfficeCode] = (codeCounts[j.linkedOfficeCode]||0)+1;
    const exists = await SDMOffice.findOne({ code: j.linkedOfficeCode }).lean();
    if (!exists) invalids.push({ subDivisionCode: j.subDivisionCode, linkedOfficeCode: j.linkedOfficeCode });
  }
  const duplicates = Object.entries(codeCounts).filter(([,c])=>c>1).map(([code,c])=>({ code, count:c }));

  console.log('RESULTS:', JSON.stringify({ results, total, withLinked, withoutLinked, invalids, duplicates }, null, 2));

  await mongoose.disconnect();
}

main().catch(err=>{ console.error(err); process.exit(2); });
