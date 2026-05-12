const express = require('express');
const router = express.Router();
const entityService = require('../services/entityService');
const ApiResponse = require('../responses/ApiResponse');

// GET /api/records/:logicalname?search=&appId=
// Used by LookupComponent to fetch candidate records for a lookup field.
// appId filters results to the same app so lookups are also app-scoped.
router.get('/:logicalname', async (req, res, next) => {
    try {
        const { logicalname } = req.params;
        const search = String(req.query.search || req.query.q || '').trim();
        const appId = req.query.appId || null;

        const records = search
            ? await entityService.searchRecords(logicalname, search, appId)
            : await entityService.getRecords(logicalname, appId);

        res.status(200).json(ApiResponse.success(null, records));
    } catch (error) {
        next(error);
    }
});

module.exports = router;
