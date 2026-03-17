class IMetadataService {
    async createEntity(entityData) { throw new Error('Not implemented'); }
    async createAttribute(attrData) { throw new Error('Not implemented'); }
    async createLookup(lookupData) { throw new Error('Not implemented'); }
    async getEntityDefinition(logicalName) { throw new Error('Not implemented'); }
}
module.exports = IMetadataService;
