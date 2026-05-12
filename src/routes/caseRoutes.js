const express = require('express');
const caseController = require('../controllers/caseController');

const router = express.Router();

router.get('/', caseController.listCases);
router.get('/:id', caseController.getCaseById);
router.post('/', caseController.createCase);
router.patch('/:id/first-response', caseController.recordFirstResponse);
router.patch('/:id/resolve', caseController.resolveCase);

module.exports = router;
