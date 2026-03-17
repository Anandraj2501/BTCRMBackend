const express = require('express');
const router = express.Router();
const entityController = require('../controllers/entityController');
const { validateEntityMetadata } = require('../middleware/validationMiddleware');

// GET /api/entity/:logicalname/search?q= (no validation)
router.get('/:logicalname/search', entityController.searchRecords);

// GET /api/entity/:logicalname/view/:viewid (no validation needed)
router.get('/:logicalname/view/:viewid', entityController.getRecordsByView);

// Apply validation middleware to all remaining entity endpoints
router.use('/:logicalname', validateEntityMetadata);

// POST /api/entity/:logicalname
router.post('/:logicalname', entityController.createRecord);

// GET /api/entity/:logicalname
router.get('/:logicalname', entityController.getRecords);

// GET /api/entity/:logicalname/:id
router.get('/:logicalname/:id', entityController.getRecordById);

// PATCH /api/entity/:logicalname/:id
router.patch('/:logicalname/:id', entityController.updateRecord);

// DELETE /api/entity/:logicalname/:id
router.delete('/:logicalname/:id', entityController.deleteRecord);

module.exports = router;
