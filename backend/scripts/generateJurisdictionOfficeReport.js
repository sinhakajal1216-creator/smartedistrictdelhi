#!/usr/bin/env node
// Read-only report comparing SDMJurisdiction entries with SDMOffice documents
// Outputs JSON array to stdout

require('dotenv').config();
const mongoose = require('mongoose');
const SDMOffice = require('../models/SDMOffice');
const SDMJurisdiction = require('../models/SDMJurisdiction');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartedistrictdelhi';

function escapeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
function containsWholeWord(name, sub){
  const re = new RegExp('\\b' + escapeRegex(sub) + '\\b','i');
  return re.test(name);
}

async function main(){
  await mongoose.connect(MONGODB_URI, { useNewUrlParser:true, useUnifiedTopology:true });
  const jurisdictions = await SDMJurisdiction.find().lean();
  const offices = await SDMOffice.find().lean();

  const rows = [];
  let counts = {HIGH:0,MEDIUM:0,LOW:0,UNRESOLVED:0};

  for(const j of jurisdictions){
    const sub = (j.subDivision || '').trim();
    const area = j.area || '';
    const candidates = [];

    // find exact name matches (case-insensitive) on office.name or office.title
    for(const o of offices){
      const officeName = (o.name || o.title || o.title) || '';
      if (!officeName) continue;
      if (officeName.trim().toLowerCase() === sub.toLowerCase()){
        candidates.push({ code: o.code, name: officeName });
      }
    }

    let proposed = 'UNRESOLVED';
    let reason = '';
    let confidence = 'UNRESOLVED';

    if (candidates.length === 1){
      proposed = candidates[0].code;
      reason = 'Exact office name equals official subDivision name';
      confidence = 'HIGH';
      counts.HIGH++;
    } else {
      // no exact match; find 'contains' candidates
      const containsCandidates = [];
      for(const o of offices){
        const officeName = (o.name || o.title || '') || '';
        if (!officeName) continue;
        if (containsWholeWord(officeName, sub)){
          containsCandidates.push({ code: o.code, name: officeName });
        }
      }
      // if exactly one contains candidate, propose with MEDIUM
      if (containsCandidates.length === 1){
        proposed = containsCandidates[0].code;
        reason = 'Office name contains subdivision name (whole-word)';
        confidence = 'MEDIUM';
        counts.MEDIUM++;
      } else if (containsCandidates.length > 1){
        reason = 'Multiple offices contain subdivision name; ambiguous';
        confidence = 'UNRESOLVED';
        counts.UNRESOLVED++;
      } else {
        // try code contains tokens (low confidence) - but do not propose; list as candidate
        const tokenCandidates = [];
        const tokens = sub.split(/[^A-Za-z0-9]+/).filter(Boolean).map(t=>t.toLowerCase());
        for(const o of offices){
          const code = (o.code||'').toLowerCase();
          if (!code) continue;
          for(const t of tokens){
            if (t.length>2 && code.includes(t)){
              tokenCandidates.push({ code: o.code, name: o.name || o.title || '' });
              break;
            }
          }
        }
        if (tokenCandidates.length===1){
          // don't propose, but mark LOW
          reason = 'Single code token match (low confidence) - candidate only';
          confidence = 'LOW';
          counts.LOW++;
          // don't set proposed
        } else {
          reason = 'No safe match found';
          confidence = 'UNRESOLVED';
          counts.UNRESOLVED++;
        }
        // append tokenCandidates to candidates list for reporting
        for(const c of tokenCandidates) candidates.push(c);
      }
    }

    // also collect any candidate offices that have subDivision included (even if not proposed)
    // but avoid duplicates
    // ensure candidates include contains matches as well
    const additional = [];
    for(const o of offices){
      const officeName = (o.name || o.title || '') || '';
      if (!officeName) continue;
      if (officeName.trim().toLowerCase()!== sub.toLowerCase() && containsWholeWord(officeName, sub)){
        if (!candidates.find(c=>c.code===o.code)) additional.push({ code: o.code, name: officeName });
      }
    }
    for(const a of additional) candidates.push(a);

    rows.push({
      subDivisionCode: j.subDivisionCode,
      area: area,
      subDivision: sub,
      existingSDMOfficeCandidates: candidates,
      proposedSDMOfficeCode: proposed,
      reason: reason || null,
      confidence
    });
  }

  console.log(JSON.stringify({rows, counts}, null, 2));
  await mongoose.disconnect();
}

main().catch(err=>{ console.error(err); process.exit(2); });
