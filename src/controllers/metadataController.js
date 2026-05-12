const metadataService = require('../services/metadataService');
const optionSetService = require('../services/optionSetService');
const ApiResponse = require('../responses/ApiResponse');

class MetadataController {
    async createEntity(req, res, next) {
        try {
            const logicalname = req.body.logicalname || req.body.LogicalName;
            const displayname = req.body.displayname || req.body.DisplayName || req.body.Displayname;
            const schemaname = req.body.schemaname || req.body.SchemaName || req.body.Schemaname;
            const primaryidattribute = req.body.primaryidattribute || req.body.PrimaryIdAttribute || req.body.Primaryidattribute;
            const primarynameattribute = req.body.primarynameattribute || req.body.PrimaryNameAttribute || req.body.Primarynameattribute;
            const isactivity = req.body.isactivity !== undefined ? req.body.isactivity : req.body.IsActivity;

            if (!logicalname || !displayname || !schemaname || !primaryidattribute || !primarynameattribute) {
                return res.status(400).json(ApiResponse.error('Missing required entity metadata fields.')); 
            }

            await metadataService.createEntity({ logicalname, displayname, schemaname, primaryidattribute, primarynameattribute, isactivity });
            res.status(201).json(ApiResponse.success(`Entity '${logicalname}' created successfully.`));
        } catch (error) { next(error); }
    }

    async createAttribute(req, res, next) {
        try {
            const entitylogicalname = req.body.entitylogicalname || req.body.EntityLogicalName || req.body.Entitylogicalname;
            const logicalname = req.body.logicalname || req.body.LogicalName;
            const displayname = req.body.displayname || req.body.DisplayName || req.body.Displayname;
            const schemaname = req.body.schemaname || req.body.SchemaName || req.body.Schemaname;
            const attributetype = req.body.attributetype || req.body.AttributeType || req.body.Attributetype;
            const maxlength = req.body.maxlength || req.body.MaxLength || req.body.Maxlength;
            const isnullable = req.body.isnullable !== undefined ? req.body.isnullable : (req.body.IsNullable !== undefined ? req.body.IsNullable : req.body.Isnullable);
            const optionsetid = req.body.optionsetid || req.body.OptionSetId || req.body.Optionsetid;
            const targetentity = req.body.targetentity || req.body.TargetEntity || req.body.Targetentity;

            if (!entitylogicalname || !logicalname || !displayname || !schemaname || !attributetype) {
                return res.status(400).json(ApiResponse.error('Missing required attribute metadata fields.'));
            }

            const attribute = await metadataService.createAttribute({ entitylogicalname, logicalname, displayname, schemaname, attributetype, maxlength, isnullable, optionsetid, targetentity });
            res.status(201).json(ApiResponse.success(`Attribute '${logicalname}' created.`, { attributeid: attribute?.attributeid }));
        } catch (error) { next(error); }
    }

    async createLookup(req, res, next) {
        try {
            const entitylogicalname = req.body.entitylogicalname || req.body.EntityLogicalName || req.body.Entitylogicalname;
            const attributelogicalname = req.body.attributelogicalname || req.body.AttributeLogicalName || req.body.Attributelogicalname;
            const referencedentitylogicalname = req.body.referencedentitylogicalname || req.body.ReferencedEntityLogicalName || req.body.Referencedentitylogicalname;
            const schemaname = req.body.schemaname || req.body.SchemaName || req.body.Schemaname;
            const relationshiptype = req.body.relationshiptype || req.body.RelationshipType || req.body.Relationshiptype;

            if (!entitylogicalname || !attributelogicalname || !referencedentitylogicalname || !schemaname) {
                return res.status(400).json(ApiResponse.error('Missing required lookup metadata fields.'));
            }

            await metadataService.createLookup({ entitylogicalname, attributelogicalname, referencedentitylogicalname, schemaname, relationshiptype });
            res.status(201).json(ApiResponse.success(`Lookup '${schemaname}' created successfully.`));
        } catch (error) { next(error); }
    }

    async updateEntity(req, res, next) {
        try {
            const { logicalname } = req.params;
            const updateData = req.body;
            await metadataService.updateEntity(logicalname, updateData);
            res.status(200).json(ApiResponse.success(`Entity '${logicalname}' updated successfully.`));
        } catch (error) { next(error); }
    }

    async updateAttribute(req, res, next) {
        try {
            const { entitylogicalname, attributelogicalname } = req.params;
            const updateData = req.body;
            await metadataService.updateAttribute(entitylogicalname, attributelogicalname, updateData);
            res.status(200).json(ApiResponse.success(`Attribute '${attributelogicalname}' updated successfully.`));
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

    async deleteEntity(req, res, next) {
        try {
            await metadataService.deleteEntity(req.params.logicalname);
            res.status(200).json(ApiResponse.success(`Entity '${req.params.logicalname}' deleted successfully.`));
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

