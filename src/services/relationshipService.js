const relationshipRepository = require('../repositories/relationshipRepository');

class RelationshipService {
    async createRelationship(data) {
        if (!data.primaryentity || !data.relatedentity) throw new Error('primaryentity and relatedentity are required');
        if (!['1:N','N:1','N:N'].includes(data.relationshiptype)) throw new Error('relationshiptype must be 1:N, N:1, or N:N');
        if (!data.relationshipname) {
            data.relationshipname = `${data.primaryentity}_${data.relatedentity}`;
        }
        return await relationshipRepository.createRelationship(data);
    }

    async getRelationshipsForEntity(logicalName) {
        return await relationshipRepository.getRelationshipsForEntity(logicalName);
    }
}

module.exports = new RelationshipService();
