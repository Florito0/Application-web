const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const { getTaxes, addTaxe, deleteTaxe, updateTaxe, isTaxeUsed } = require('../controllers/taxeController');

router.use(authenticateToken);
router.get('/', getTaxes);
router.post('/', addTaxe);
router.delete('/:id', deleteTaxe);
router.put('/:id', updateTaxe);
router.get('/:id/usage', isTaxeUsed);

module.exports = router;
