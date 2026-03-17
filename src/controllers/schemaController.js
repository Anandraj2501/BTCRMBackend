const relationshipService = require('../services/relationshipService');
const formService = require('../services/formService');
const viewService = require('../services/viewService');
const ApiResponse = require('../responses/ApiResponse');

class SchemaController {
    // ─── Relationships ───────────────────────────────────────────
    async createRelationship(req, res, next) {
        try {
            await relationshipService.createRelationship(req.body);
            res.status(201).json(ApiResponse.success('Relationship created successfully.'));
        } catch (err) { next(err); }
    }

    async getRelationships(req, res, next) {
        try {
            const data = await relationshipService.getRelationshipsForEntity(req.params.logicalname);
            res.json(ApiResponse.success(null, data));
        } catch (err) { next(err); }
    }

    // ─── Forms ────────────────────────────────────────────────────
    async saveForm(req, res, next) {
        try {
            await formService.saveForm(req.body);
            res.status(201).json(ApiResponse.success('Form saved successfully.'));
        } catch (err) { next(err); }
    }

    async getForms(req, res, next) {
        try {
            const data = await formService.getFormsForEntity(req.params.logicalname);
            res.json(ApiResponse.success(null, data));
        } catch (err) { next(err); }
    }

    async getDefaultForm(req, res, next) {
        try {
            const data = await formService.getDefaultForm(req.params.logicalname);
            res.json(ApiResponse.success(null, data));
        } catch (err) { next(err); }
    }

    // ─── Views ────────────────────────────────────────────────────
    async saveView(req, res, next) {
        try {
            await viewService.saveView(req.body);
            res.status(201).json(ApiResponse.success('View saved successfully.'));
        } catch (err) { next(err); }
    }

    async getViews(req, res, next) {
        try {
            const data = await viewService.getViewsForEntity(req.params.logicalname);
            res.json(ApiResponse.success(null, data));
        } catch (err) { next(err); }
    }

    async getDefaultView(req, res, next) {
        try {
            const data = await viewService.getDefaultView(req.params.logicalname);
            res.json(ApiResponse.success(null, data));
        } catch (err) { next(err); }
    }
}

module.exports = new SchemaController();
