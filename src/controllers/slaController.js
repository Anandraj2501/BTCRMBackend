const ApiResponse = require('../responses/ApiResponse');
const slaService = require('../services/slaService');

class SlaController {
    async createSla(req, res, next) {
        try {
            const data = await slaService.createSla(req.body);
            res.status(201).json(ApiResponse.success('SLA created successfully.', data));
        } catch (error) {
            next(error);
        }
    }

    async createSlaItem(req, res, next) {
        try {
            const data = await slaService.createSlaItem(req.body);
            res.status(201).json(ApiResponse.success('SLA item created successfully.', data));
        } catch (error) {
            next(error);
        }
    }

    async createEntitlement(req, res, next) {
        try {
            const data = await slaService.createEntitlement(req.body);
            res.status(201).json(ApiResponse.success('Entitlement created successfully.', data));
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SlaController();
