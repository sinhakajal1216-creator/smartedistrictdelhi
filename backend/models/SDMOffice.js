const mongoose = require('mongoose');

const JurisdictionSchema = new mongoose.Schema({
  pincodes: [String],
  wards: [String],
  localities: [String]
}, { _id: false });

const SDMOfficeSchema = new mongoose.Schema({
  code: { type: String, index: true },
  name: { type: String, required: true },
  fullAddress: String,
  pincode: String,
  locality: String,
  ward: String,
  jurisdiction: JurisdictionSchema,
  verificationTimings: String,
  workingDays: [String],
  phone: String,
  email: String,
  latitude: { type: Number },
  longitude: { type: Number },
  notes: String
}, { timestamps: true });

module.exports = mongoose.model('SDMOffice', SDMOfficeSchema);
