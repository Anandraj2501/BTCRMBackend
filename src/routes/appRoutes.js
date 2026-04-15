const express = require('express');
const router = express.Router();
const appController = require('../controllers/appController');

router.get('/', appController.listApps);
router.get('/:appId', appController.getApp);
router.get('/:appId/bundle', appController.getAppBundle);
router.post('/', appController.saveDraftApp);
router.post('/:appId/publish', appController.publishApp);
router.delete('/:appId', appController.deleteApp);

module.exports = router;
