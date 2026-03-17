class IEntityRepository {
    async createRecord(logicalName, baseEntityId, recordId, primaryIdKey, data) { throw new Error('Not implemented'); }
    async createBaseEntity(logicalName, ownerId) { throw new Error('Not implemented'); }
    async getRecords(logicalName) { throw new Error('Not implemented'); }
    async getRecordById(logicalName, primaryIdKey, id) { throw new Error('Not implemented'); }
    async updateRecord(logicalName, primaryIdKey, id, baseEntityId, data) { throw new Error('Not implemented'); }
    async softDeleteRecord(baseEntityId) { throw new Error('Not implemented'); }
    async verifyRecordExists(logicalName, primaryIdKey, id) { throw new Error('Not implemented'); }
}
module.exports = IEntityRepository;
