const IMetadataService = require('../interfaces/IMetadataService');
const metadataRepository = require('../repositories/metadataRepository');
const metadataCache = require('../utils/metadataCache');
const EntityNotFoundException = require('../exceptions/EntityNotFoundException');

class MetadataService extends IMetadataService {
    async createEntity(entityData) {
        await metadataRepository.executeCreateEntitySp(entityData);
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

    async getEntityDefinition(logicalName) {
        let cached = metadataCache.getEntityMap(logicalName);
        if (cached) return cached;

        const entity = await metadataRepository.getEntityMetadata(logicalName);
        if (!entity) {
            throw new EntityNotFoundException(logicalName);
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
        return await metadataRepository.getAllEntitiesMetadata();
    }
}

module.exports = new MetadataService();
