const express = require('express');
const router = express.Router();
const metadataController = require('../controllers/metadataController');
const schemaController = require('../controllers/schemaController');
const path = require('path');

// ─── Pages ────────────────────────────────────────────────────────────────────
router.get('/edit/attribute', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/edit-attribute.html'));
});

// ─── Entities ─────────────────────────────────────────────────────────────────
router.get('/entity', metadataController.getAllEntities);
router.get('/entity/:logicalname', metadataController.getEntityDefinition);
router.post('/entity', metadataController.createEntity);
router.patch('/entity/:logicalname', metadataController.updateEntity);

// ─── Attributes ───────────────────────────────────────────────────────────────
router.post('/attribute', metadataController.createAttribute);
router.patch('/attribute/:entitylogicalname/:attributelogicalname', metadataController.updateAttribute);
router.post('/lookup', metadataController.createLookup);

// ─── Option Sets ──────────────────────────────────────────────────────────────
router.get('/optionset', metadataController.getAllOptionSets);
router.get('/optionset/:id', metadataController.getOptionSetById);
router.post('/optionset', metadataController.createOptionSet);
router.patch('/optionset/:id', metadataController.updateOptionSet);

// ─── Relationships ────────────────────────────────────────────────────────────
router.get('/relationship/:logicalname', schemaController.getRelationships);
router.post('/relationship', schemaController.createRelationship);

// ─── Forms ────────────────────────────────────────────────────────────────────
router.get('/form/:logicalname', schemaController.getForms);
router.get('/form/:logicalname/default', schemaController.getDefaultForm);
router.post('/form', schemaController.saveForm);

// ─── Views ────────────────────────────────────────────────────────────────────
router.get('/view/:logicalname', schemaController.getViews);
router.get('/view/:logicalname/default', schemaController.getDefaultView);
router.post('/view', schemaController.saveView);

module.exports = router;

