const express = require('express');
const router = express.Router();
const configurationController = require('../controllers/configurationController');

router.get('/', configurationController.getConfiguration);
router.post('/', configurationController.updateConfiguration);
router.get('/tax-assignments', configurationController.getTaxAssignments);
router.post('/tax-assignments', configurationController.saveTaxAssignments);

module.exports = router;
