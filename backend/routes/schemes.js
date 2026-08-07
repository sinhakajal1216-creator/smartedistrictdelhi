const express = require('express');
const router = express.Router();
const schemeController = require('../controllers/schemeController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.get('/', schemeController.list);
router.get('/departments', schemeController.getDepartments);
router.get('/categories', schemeController.getCategories);
router.get('/:id', schemeController.getById);
// Create scheme - admin only
router.post('/', auth, requireRole('admin'), schemeController.create);

module.exports = router;
