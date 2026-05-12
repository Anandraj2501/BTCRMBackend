const IMetadataService = require('../interfaces/IMetadataService');
const metadataRepository = require('../repositories/metadataRepository');
const metadataCache = require('../utils/metadataCache');
const EntityNotFoundException = require('../exceptions/EntityNotFoundException');
const ValidationException = require('../exceptions/ValidationException');
const { getCoreEntityDefinition, getCoreEntitiesList } = require('../constants/coreSalesMetadata');
const viewRepository = require('../repositories/viewRepository');

const PROTECTED_ENTITY_NAMES = new Set(['account', 'contact']);

class MetadataService extends IMetadataService {
    async createEntity(entityData) {
        await metadataRepository.executeCreateEntitySp(entityData);
        // Seed default views for the new entity
        await viewRepository.seedDefaultViews(
            entityData.logicalname, 
            entityData.displayname, 
            entityData.primarynameattribute || 'name'
        );
        metadataCache.invalidateEntity(entityData.logicalname);
    }

    async createAttribute(attrData) {
        const attribute = await metadataRepository.executeCreateAttributeSp(attrData);
        metadataCache.invalidateEntity(attrData.entitylogicalname);
        return attribute;
    }

    async createLookup(lookupData) {
        await metadataRepository.executeCreateLookupSp(lookupData);
        metadataCache.invalidateEntity(lookupData.entitylogicalname);
    }

    async updateEntity(logicalName, updateData) {
        await metadataRepository.updateEntity(logicalName, updateData);
        metadataCache.invalidateEntity(logicalName);
    }

    async updateAttribute(entityLogicalName, attributeLogicalName, updateData) {
        await metadataRepository.updateAttribute(entityLogicalName, attributeLogicalName, updateData);
        metadataCache.invalidateEntity(entityLogicalName);
    }

    async getEntityDefinition(logicalName) {
        let cached = metadataCache.getEntityMap(logicalName);
        if (cached) return cached;

        const entity = await metadataRepository.getEntityMetadata(logicalName);
        if (!entity) {
            const coreDefinition = getCoreEntityDefinition(logicalName);
            if (!coreDefinition) {
                throw new EntityNotFoundException(logicalName);
            }
            metadataCache.setEntityMap(logicalName, coreDefinition);
            return coreDefinition;
        }

        const attributes = await metadataRepository.getAttributesMetadata(entity.entityid);
        const lookups = await metadataRepository.getEntityLookups(entity.entityid);

        const definition = {
            metadata: entity,
            attributes: attributes,
            lookups: lookups,
            attributeMap: {}
        };

        attributes.forEach(attr => {
            definition.attributeMap[attr.logicalname] = attr;
        });

        metadataCache.setEntityMap(logicalName, definition);
        return definition;
    }

    async getAllEntities() {
        const databaseEntities = await metadataRepository.getAllEntitiesMetadata();
        const existing = new Set(databaseEntities.map((entity) => String(entity.logicalname || '').toLowerCase()));
        const coreEntities = getCoreEntitiesList().filter((entity) => !existing.has(entity.logicalname));
        return [...databaseEntities, ...coreEntities].sort((left, right) =>
            String(left.logicalname || '').localeCompare(String(right.logicalname || ''))
        );
    }

    async deleteEntity(logicalname) {
        const normalized = String(logicalname || '').toLowerCase();
        if (PROTECTED_ENTITY_NAMES.has(normalized)) {
            throw new ValidationException(`Entity '${normalized}' is protected and cannot be deleted.`);
        }
        metadataCache.invalidateEntity(logicalname);
        await metadataRepository.deleteEntityByLogicalName(logicalname);
    }
}

module.exports = new MetadataService();
