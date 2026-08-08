const mongoose = require('mongoose');

const SDMJurisdictionSchema = new mongoose.Schema({
  subDivisionCode: { type: String, required: true, unique: true, index: true },
  area: String,
  subDivision: { type: String, required: true },
  administrationType: String,
  mcdWards: [String],
  source: String,
  sourceUrl: String,
  sourceDate: String,
  notes: String,
  // link to SDMOffice via its code (do NOT modify SDMOffice documents)
  linkedOfficeCode: String
}, { timestamps: true });

module.exports = mongoose.model('SDMJurisdiction', SDMJurisdictionSchema);
