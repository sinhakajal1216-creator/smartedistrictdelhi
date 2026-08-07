const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  pincode: String,
  locality: String,
  ward: String,
  fullAddress: String
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  passwordHash: { type: String, required: true },
  languagePref: { type: String, default: 'en' },
  address: AddressSchema,
  // citizenProfile stores questionnaire data for eligibility matching
  citizenProfile: {
    age: Number,
    residency: Boolean,
    income: Number,
    gender: String,
    category: String,
    occupation: String,
    disability: Boolean,
    maritalStatus: String
  },
  roles: { type: [String], default: ['citizen'] }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
