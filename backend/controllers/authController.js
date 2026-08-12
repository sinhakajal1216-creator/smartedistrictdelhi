const authService = require('../services/authService');

exports.register = (req, res) => {
  try {
    const result = authService.registerUser(req.body || {});
    return res.status(201).json({
      message: 'Registration successful',
      token: result.token,
      user: result.user
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Registration failed' });
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
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Login failed' });
  }
};

exports.me = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const user = authService.getUserFromToken(authHeader);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    return res.status(200).json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
};

exports.updateProfile = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const authUser = authService.getUserFromToken(authHeader);
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    const updatedUser = authService.updateUserProfile(authUser.id, req.body || {});
    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Profile update failed' });
  }
};
