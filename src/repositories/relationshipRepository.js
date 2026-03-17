const { sql, poolPromise } = require('../config/db');

class RelationshipRepository {
    async createRelationship(data) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('relationshipname', sql.NVarChar(255), data.relationshipname)
            .input('relationshiptype', sql.NVarChar(10), data.relationshiptype)
            .input('primaryentity', sql.NVarChar(100), data.primaryentity)
            .input('relatedentity', sql.NVarChar(100), data.relatedentity)
            .input('cascadebehavior', sql.NVarChar(50), data.cascadebehavior || 'None')
            .query(`
                DECLARE @primaryEntityId UNIQUEIDENTIFIER = (SELECT entityid FROM EntityMetadata WHERE logicalname = @primaryentity);
                DECLARE @relatedEntityId UNIQUEIDENTIFIER = (SELECT entityid FROM EntityMetadata WHERE logicalname = @relatedentity);
                IF @primaryEntityId IS NULL THROW 50001, 'Primary entity not found', 1;
                IF @relatedEntityId IS NULL THROW 50001, 'Related entity not found', 1;
                INSERT INTO RelationshipMetadata (relationshipname, relationshiptype, primaryentityid, relatedentityid, cascadebehavior)
                VALUES (@relationshipname, @relationshiptype, @primaryEntityId, @relatedEntityId, @cascadebehavior);
                SELECT SCOPE_IDENTITY() as id;
            `);
        return result.recordset;
    }

    async getRelationshipsForEntity(logicalName) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('logicalname', sql.NVarChar(100), logicalName)
            .query(`
                SELECT 
                    r.*,
                    pe.logicalname as primaryentityname,
                    pe.displayname as primaryentitydisplayname,
                    re.logicalname as relatedentityname,
                    re.displayname as relatedentitydisplayname
                FROM RelationshipMetadata r
                JOIN EntityMetadata pe ON r.primaryentityid = pe.entityid
                JOIN EntityMetadata re ON r.relatedentityid = re.entityid
                WHERE pe.logicalname = @logicalname OR re.logicalname = @logicalname
                ORDER BY r.createdon DESC
            `);
        return result.recordset;
    }
}

module.exports = new RelationshipRepository();
