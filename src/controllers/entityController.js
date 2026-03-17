const entityService = require('../services/entityService');
const ApiResponse = require('../responses/ApiResponse');
const ValidationException = require('../exceptions/ValidationException');

class EntityController {
    async createRecord(req, res, next) {
        try {
            const { logicalname } = req.params;
            const data = req.body;
            const result = await entityService.createRecord(logicalname, data);
            res.status(201).json(ApiResponse.success(`Record created successfully`, result));
        } catch (error) {
            next(error);
        }
    }

    async getRecords(req, res, next) {
        try {
            const { logicalname } = req.params;
            const records = await entityService.getRecords(logicalname);
            res.status(200).json(ApiResponse.success(null, records));
        } catch (error) {
            next(error);
        }
    }

    async getRecordById(req, res, next) {
        try {
            const { logicalname, id } = req.params;
            const record = await entityService.getRecordById(logicalname, id);
            res.status(200).json(ApiResponse.success(null, record));
        } catch (error) {
            next(error);
        }
    }

    async updateRecord(req, res, next) {
        try {
            const { logicalname, id } = req.params;
            const data = req.body;
            if (Object.keys(data).length === 0) throw new ValidationException('No fields provided for update.');
            await entityService.updateRecord(logicalname, id, data);
            res.status(200).json(ApiResponse.success(`Record updated successfully`));
        } catch (error) {
            next(error);
        }
    }

    async deleteRecord(req, res, next) {
        try {
            const { logicalname, id } = req.params;
            await entityService.deleteRecord(logicalname, id);
            res.status(200).json(ApiResponse.success(`Record softly deleted successfully.`));
        } catch (error) {
            next(error);
        }
    }

    async searchRecords(req, res, next) {
        try {
            const { logicalname } = req.params;
            const q = req.query.q || '';
            const records = await entityService.searchRecords(logicalname, q);
            res.status(200).json(ApiResponse.success(null, records));
        } catch (error) {
            next(error);
        }
    }

    async getRecordsByView(req, res, next) {
        try {
            const { logicalname, viewid } = req.params;
            const records = await entityService.getRecordsByView(logicalname, viewid);
            res.status(200).json(ApiResponse.success(null, records));
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new EntityController();
