class IEntityService {
    async createRecord(logicalName, data) { throw new Error('Not implemented'); }
    async getRecords(logicalName) { throw new Error('Not implemented'); }
    async getRecordById(logicalName, id) { throw new Error('Not implemented'); }
    async updateRecord(logicalName, id, data) { throw new Error('Not implemented'); }
    async deleteRecord(logicalName, id) { throw new Error('Not implemented'); }
}
module.exports = IEntityService;
