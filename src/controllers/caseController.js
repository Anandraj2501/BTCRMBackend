const ApiResponse = require('../responses/ApiResponse');
const caseService = require('../services/caseService');

class CaseController {
    async listCases(req, res, next) {
        try {
            const data = await caseService.listCases(req.query);
            res.json(ApiResponse.success(null, data));
        } catch (error) {
            next(error);
        }
    }

    async getCaseById(req, res, next) {
        try {
            const data = await caseService.getCaseById(req.params.id || req.params.caseId);
            res.json(ApiResponse.success(null, data));
        } catch (error) {
            next(error);
        }
    }

    async createCase(req, res, next) {
        try {
            const data = await caseService.createCase(req.body);
            res.status(201).json(ApiResponse.success('Case created and SLA applied successfully.', data));
        } catch (error) {
            next(error);
        }
    }

    async recordFirstResponse(req, res, next) {
        try {
            const data = await caseService.recordFirstResponse(req.params.id);
            res.json(ApiResponse.success('First response recorded.', data));
        } catch (error) {
            next(error);
        }
    }

    async resolveCase(req, res, next) {
        try {
            const data = await caseService.resolveCase(req.params.id);
            res.json(ApiResponse.success('Case resolved and SLA status updated.', data));
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CaseController();
