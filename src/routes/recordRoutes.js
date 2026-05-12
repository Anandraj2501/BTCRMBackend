const express = require('express');
const router = express.Router();
const entityService = require('../services/entityService');
const ApiResponse = require('../responses/ApiResponse');

router.get('/:logicalname', async (req, res, next) => {
    try {
        const { logicalname } = req.params;
        const search = String(req.query.search || req.query.q || '').trim();
        const records = search
            ? await entityService.searchRecords(logicalname, search)
            : await entityService.getRecords(logicalname);

        res.status(200).json(ApiResponse.success(null, records));
    } catch (error) {
        next(error);
    }
});

module.exports = router;
