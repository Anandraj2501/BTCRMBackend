const metadataService = require('../services/metadataService');
const optionSetService = require('../services/optionSetService');
const ApiResponse = require('../responses/ApiResponse');

class MetadataController {
    async createEntity(req, res, next) {
        try {
            const { logicalname, displayname, schemaname, primaryidattribute, primarynameattribute, isactivity } = req.body;
            await metadataService.createEntity({ logicalname, displayname, schemaname, primaryidattribute, primarynameattribute, isactivity });
            res.status(201).json(ApiResponse.success(`Entity '${logicalname}' created successfully.`));
        } catch (error) { next(error); }
    }

    async createAttribute(req, res, next) {
        try {
            const { entitylogicalname, logicalname, displayname, schemaname, attributetype, maxlength, isnullable, optionsetid, targetentity } = req.body;
            const attribute = await metadataService.createAttribute({ entitylogicalname, logicalname, displayname, schemaname, attributetype, maxlength, isnullable, optionsetid, targetentity });
            res.status(201).json(ApiResponse.success(`Attribute '${logicalname}' created.`, { attributeid: attribute?.attributeid }));
        } catch (error) { next(error); }
    }

    async createLookup(req, res, next) {
        try {
            const { entitylogicalname, attributelogicalname, referencedentitylogicalname, schemaname, relationshiptype } = req.body;
            await metadataService.createLookup({ entitylogicalname, attributelogicalname, referencedentitylogicalname, schemaname, relationshiptype });
            res.status(201).json(ApiResponse.success(`Lookup '${schemaname}' created successfully.`));
        } catch (error) { next(error); }
    }

    async getAllEntities(req, res, next) {
        try {
            const entities = await metadataService.getAllEntities();
            res.status(200).json(ApiResponse.success(null, entities));
        } catch (error) { next(error); }
    }

    async getEntityDefinition(req, res, next) {
        try {
            const definition = await metadataService.getEntityDefinition(req.params.logicalname);
            res.status(200).json(ApiResponse.success(null, definition));
        } catch (error) { next(error); }
    }

    // ─── Option Sets ──────────────────────────────────────────────────────────
    async createOptionSet(req, res, next) {
        try {
            const result = await optionSetService.createOptionSet(req.body);
            res.status(201).json(ApiResponse.success('Option set created.', result));
        } catch (error) { next(error); }
    }

    async getAllOptionSets(req, res, next) {
        try {
            const data = await optionSetService.getAllOptionSets();
            res.status(200).json(ApiResponse.success(null, data));
        } catch (error) { next(error); }
    }

    async getOptionSetById(req, res, next) {
        try {
            const data = await optionSetService.getOptionSetById(req.params.id);
            res.status(200).json(ApiResponse.success(null, data));
        } catch (error) { next(error); }
    }

    async updateOptionSet(req, res, next) {
        try {
            await optionSetService.updateOptionSet(req.params.id, req.body);
            res.status(200).json(ApiResponse.success('Option set updated.'));
        } catch (error) { next(error); }
    }
}

module.exports = new MetadataController();

