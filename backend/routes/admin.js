const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// All admin routes require auth and admin role
router.use(auth, requireRole('admin'));

// Promote a user by id (admin only)
router.post('/users/:id/promote', adminController.promoteUser);

// List users (admin only)
router.get('/users', adminController.listUsers);

// List recently created schemes (seed visibility) - admin only
router.get('/seeds', adminController.listSeeded);

module.exports = router;
