class IMetadataRepository {
    async getEntityMetadata(logicalName) { throw new Error('Not implemented'); }
    async getAttributesMetadata(entityId) { throw new Error('Not implemented'); }
    async getEntityLookups(entityId) { throw new Error('Not implemented'); }
    async executeCreateEntitySp(entityData) { throw new Error('Not implemented'); }
    async executeCreateAttributeSp(attrData) { throw new Error('Not implemented'); }
    async executeCreateLookupSp(lookupData) { throw new Error('Not implemented'); }
}
module.exports = IMetadataRepository;
