const express = require('express');
const slaController = require('../controllers/slaController');

const router = express.Router();

router.post('/slas', slaController.createSla);
router.post('/sla-items', slaController.createSlaItem);
router.post('/entitlements', slaController.createEntitlement);

module.exports = router;
