const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.me);
// authenticated update of citizen profile
const authMiddleware = require('../middleware/auth');
router.put('/profile', authMiddleware, authController.updateProfile);

module.exports = router;
