const User = require('../models/User');
const Scheme = require('../models/Scheme');

exports.promoteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!Array.isArray(user.roles)) user.roles = [];
    if (!user.roles.includes('admin')) {
      user.roles.push('admin');
      await user.save();
    }
    res.json({ message: 'User promoted to admin', user: { id: user._id, email: user.email, roles: user.roles } });
  } catch (err) {
    console.error('promoteUser error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().select('name email roles createdAt');
    res.json({ users });
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin-only: list recently created schemes (seed visibility)
exports.listSeeded = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const schemes = await Scheme.find().sort({ createdAt: -1 }).limit(limit).select('title code department createdAt');
    res.json({ schemes });
  } catch (err) {
    console.error('listSeeded error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
