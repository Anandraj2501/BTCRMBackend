const IEntityService = require('../interfaces/IEntityService');
const entityRepository = require('../repositories/entityRepository');
const metadataService = require('./metadataService');
const NotFoundException = require('../exceptions/NotFoundException');
const ValidationException = require('../exceptions/ValidationException');
const { isGuid, requireGuid } = require('../utils/guid');

class EntityService extends IEntityService {
    async validateMetadata(logicalName, data) {
        const def = await metadataService.getEntityDefinition(logicalName);
        
        for (const key of Object.keys(data)) {
            if (key === 'baseentityid' || key === def.metadata.primaryidattribute || key === 'ownerid') continue;
            
            const attrMeta = def.attributeMap[key];
            if (!attrMeta) {
                throw new ValidationException(`Attribute '${key}' does not exist on entity '${logicalName}'.`);
            }

            if (attrMeta.attributetype === 'Lookup' || attrMeta.attributetype === 'Uniqueidentifier') {
                if (data[key] && !isGuid(data[key])) {
                    throw new ValidationException(`Attribute '${key}' must be a valid GUID.`);
                }

                const lookupMetaList = def.lookups.filter(l => l.attributeid === attrMeta.attributeid);
                if (lookupMetaList.length > 0) {
                    const targetId = data[key];
                    if (targetId) {
                        const targetLogicalName = lookupMetaList[0].referencedentityname;
                        const targetDef = await metadataService.getEntityDefinition(targetLogicalName);
                        const exists = await entityRepository.verifyRecordExists(targetLogicalName, targetDef.metadata.primaryidattribute, targetId);
                        if (!exists) {
                            throw new ValidationException(`Lookup reference invalid: Record '${targetId}' not found in '${targetLogicalName}'.`);
                        }
                    }
                }
            }
        }
        return def;
    }

    async createRecord(logicalName, data, appId = null) {
        if (String(logicalName || '').toLowerCase() === 'cases') {
            const caseService = require('./caseService');
            const record = await caseService.createCase(data);
            return { ...record, id: record.caseId };
        }

        const def = await this.validateMetadata(logicalName, data);
        const hasBaseEntity = def.metadata.iscustomentity === 1 || def.attributeMap['baseentityid'] !== undefined;
        return await entityRepository.createRecord(logicalName, data, def.metadata.primaryidattribute, hasBaseEntity, appId);
    }

    async getRecords(logicalName, appId = null, viewId = null) {
        const def = await metadataService.getEntityDefinition(logicalName);
        const hasBaseEntity = def.metadata.iscustomentity === 1 || def.attributeMap['baseentityid'] !== undefined;
        let filters = [];
        if (viewId) {
            const viewRepository = require('../repositories/viewRepository');
            const view = await viewRepository.getViewById(viewId);
            if (view && view.definition && view.definition.filters) {
                filters = view.definition.filters;
            }
        }
        return await entityRepository.getRecords(logicalName, hasBaseEntity, appId, filters);
    }

    async getRecordById(logicalName, id, appId = null) {
        id = requireGuid(id, 'Record id');
        const def = await metadataService.getEntityDefinition(logicalName);
        const hasBaseEntity = def.metadata.iscustomentity === 1 || def.attributeMap['baseentityid'] !== undefined;
        
        const record = await entityRepository.getRecordById(logicalName, def.metadata.primaryidattribute, id, hasBaseEntity, appId);
        if (!record) throw new NotFoundException();
        return record;
    }

    async updateRecord(logicalName, id, data) {
        id = requireGuid(id, 'Record id');
        const def = await this.validateMetadata(logicalName, data);
        const hasBaseEntity = def.metadata.iscustomentity === 1 || def.attributeMap['baseentityid'] !== undefined;
        
        let baseEntityId = null;
        if (hasBaseEntity) {
            baseEntityId = await entityRepository.getBaseEntityId(logicalName, def.metadata.primaryidattribute, id);
            if (!baseEntityId) throw new NotFoundException('Record not found or is inactive.');
        } else {
            const exists = await entityRepository.verifyRecordExists(logicalName, def.metadata.primaryidattribute, id);
            if (!exists) throw new NotFoundException();
        }

        await entityRepository.updateRecord(logicalName, def.metadata.primaryidattribute, id, baseEntityId, data);
    }

    async deleteRecord(logicalName, id) {
        id = requireGuid(id, 'Record id');
        const def = await metadataService.getEntityDefinition(logicalName);
        const hasBaseEntity = def.metadata.iscustomentity === 1 || def.attributeMap['baseentityid'] !== undefined;

        if (hasBaseEntity) {
            const baseEntityId = await entityRepository.getBaseEntityId(logicalName, def.metadata.primaryidattribute, id);
            if (!baseEntityId) throw new NotFoundException();
            await entityRepository.softDeleteRecord(baseEntityId);
        } else {
            throw new ValidationException(`Entity '${logicalName}' does not support soft delete.`);
        }
    }

    async searchRecords(logicalName, query, appId = null) {
        const def = await metadataService.getEntityDefinition(logicalName);
        const primaryName = def.metadata.primarynameattribute || 'name';
        return await entityRepository.searchRecords(logicalName, primaryName, query, appId);
    }

    async getRecordsByView(logicalName, viewId) {
        viewId = requireGuid(viewId, 'View id');
        const viewRepository = require('../repositories/viewRepository');
        const view = await viewRepository.getViewById(viewId);
        if (!view) throw new (require('../exceptions/NotFoundException'))(`View ${viewId} not found`);
        return await entityRepository.getRecordsByView(logicalName, view.definition);
    }
}

module.exports = new EntityService();
