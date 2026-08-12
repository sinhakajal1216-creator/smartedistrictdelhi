const express = require('express');
const schemeController = require('../controllers/schemeController');

const router = express.Router();

router.get('/departments', schemeController.departments);
router.get('/categories', schemeController.categories);
router.get('/', schemeController.list);
router.get('/:id', schemeController.getById);

module.exports = router;
