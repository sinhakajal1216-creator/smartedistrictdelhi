const authService = require('../services/authService');

function publicError(err, fallback) {
  const status = err.statusCode || 500;
  const message = status >= 500 ? fallback : (err.message || fallback);
  return { status, message };
}

exports.register = (req, res) => {
  try {
    const result = authService.registerUser(req.body || {});
    return res.status(201).json({
      message: 'Registration successful',
      token: result.token,
      user: result.user
    });
  } catch (err) {
    const { status, message } = publicError(err, 'Registration failed');
    return res.status(status).json({ error: message });
  }
};

exports.login = (req, res) => {
  try {
    const result = authService.loginUser(req.body || {});
    return res.status(200).json({
      message: 'Login successful',
      token: result.token,
      user: result.user
    });
  } catch (err) {
    const { status, message } = publicError(err, 'Login failed');
    return res.status(status).json({ error: message });
  }
};

exports.me = (req, res) => {
  return res.status(200).json({ user: req.user });
};

exports.updateProfile = (req, res) => {
  try {
    const updatedUser = authService.updateUserProfile(req.user.id, req.body || {});
    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    const { status, message } = publicError(err, 'Profile update failed');
    return res.status(status).json({ error: message });
  }
};

exports.logout = (req, res) => {
  authService.revokeToken(req.headers.authorization);
  return res.status(200).json({ message: 'Logged out' });
};
