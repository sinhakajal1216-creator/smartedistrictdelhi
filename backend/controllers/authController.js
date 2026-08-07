const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, passwordHash: hash });
    await user.save();
    const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.me = async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.id).select('-passwordHash');
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Update the authenticated user's citizen profile
exports.updateProfile = async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const allowed = ['age','residency','income','gender','category','occupation','disability','maritalStatus'];
    const profile = {};
    allowed.forEach(k => {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) profile[k] = req.body[k];
    });

    // Attach profile object to user.citizenProfile
    user.citizenProfile = { ...(user.citizenProfile || {}), ...profile };
    await user.save();

    const safe = user.toObject();
    delete safe.passwordHash;
    res.json({ user: safe });
  } catch (err) {
    console.error('updateProfile error:', err);
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Invalid token' });
    res.status(500).json({ error: 'Server error' });
  }
};
