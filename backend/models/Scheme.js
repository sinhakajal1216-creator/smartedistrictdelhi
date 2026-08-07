const mongoose = require('mongoose');

const StepSchema = new mongoose.Schema({
  title: String,
  description: String,
  link: String
}, { _id: false });

const SchemeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  categories: [String],
  department: String,
  eligibilityRules: { type: mongoose.Schema.Types.Mixed }, // structured JSON rules
  requiredDocuments: [String],
  steps: [StepSchema],
  officialLink: String,
  published: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Scheme', SchemeSchema);
